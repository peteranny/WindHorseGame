import { createRemoteSync } from "./remoteSync";
import { PersistedGameState } from "./types";

const state = (timestamp: number): PersistedGameState => ({
  position: [0, 0],
  facing: "left",
  captured: {},
  cooldowns: {},
  exploredCells: {},
  goalDefeatedAt: null,
  timestamp,
});

// A promise plus externally-callable resolve, so each test can control
// exactly when a save "completes" instead of guessing at timing.
const deferred = <T>(): {
  promise: Promise<T>;
  resolve: (value: T) => void;
} => {
  let resolve!: (value: T) => void;
  const promise = new Promise<T>((res) => {
    resolve = res;
  });
  return { promise, resolve };
};

// Flushes microtasks so promise .then() callbacks queued by the controller
// run before the next assertion. Jest lets a test return a promise instead
// of using async/await, which this project's babel setup can't transpile
// (no regeneratorRuntime polyfill is included - see gameStore.ts's history).
const flush = (): Promise<void> =>
  Promise.resolve()
    .then(() => Promise.resolve())
    .then(() => undefined);

describe("createRemoteSync", () => {
  it("attempts a save as soon as one is scheduled", () => {
    const save = jest.fn().mockReturnValue(new Promise(() => {}));
    const sync = createRemoteSync({ save });

    sync.scheduleSave("key-a", state(1));

    expect(save).toHaveBeenCalledTimes(1);
    expect(save).toHaveBeenCalledWith("key-a", state(1));
    expect(sync.hasPending()).toBe(true);
  });

  it("clears the pending write once the save succeeds", () => {
    const { promise, resolve } = deferred<boolean>();
    const save = jest.fn().mockReturnValue(promise);
    const sync = createRemoteSync({ save });

    sync.scheduleSave("key-a", state(1));
    resolve(true);
    return flush().then(() => {
      expect(sync.hasPending()).toBe(false);
    });
  });

  it("keeps the write pending after a failed save, and does not retry on its own", () => {
    const { promise, resolve } = deferred<boolean>();
    const save = jest.fn().mockReturnValue(promise);
    const sync = createRemoteSync({ save });

    sync.scheduleSave("key-a", state(1));
    resolve(false);
    return flush().then(() => {
      expect(sync.hasPending()).toBe(true);
      expect(save).toHaveBeenCalledTimes(1);
    });
  });

  it("retries a failed write only when retryPending is called", () => {
    const first = deferred<boolean>();
    const save = jest.fn().mockReturnValueOnce(first.promise);
    const sync = createRemoteSync({ save });

    sync.scheduleSave("key-a", state(1));
    first.resolve(false);
    return flush().then(() => {
      expect(save).toHaveBeenCalledTimes(1);

      const second = deferred<boolean>();
      save.mockReturnValueOnce(second.promise);
      sync.retryPending();
      expect(save).toHaveBeenCalledTimes(2);
      expect(save).toHaveBeenLastCalledWith("key-a", state(1));

      second.resolve(true);
      return flush().then(() => {
        expect(sync.hasPending()).toBe(false);
      });
    });
  });

  it("does not start a second save while one is already in flight", () => {
    const save = jest.fn().mockReturnValue(new Promise(() => {}));
    const sync = createRemoteSync({ save });

    sync.scheduleSave("key-a", state(1));
    sync.scheduleSave("key-a", state(2));
    sync.retryPending();

    expect(save).toHaveBeenCalledTimes(1);
    expect(save).toHaveBeenCalledWith("key-a", state(1));
  });

  it("a newer write supersedes an older one still in flight", () => {
    const first = deferred<boolean>();
    const save = jest.fn().mockReturnValueOnce(first.promise);
    const sync = createRemoteSync({ save });

    sync.scheduleSave("key-a", state(1));
    sync.scheduleSave("key-a", state(2));
    first.resolve(true); // the stale first write "succeeds" after being superseded
    return flush().then(() => {
      // The newer write (state(2)) must not be dropped just because the
      // earlier, now-stale request happened to resolve successfully.
      expect(sync.hasPending()).toBe(true);

      const second = deferred<boolean>();
      save.mockReturnValueOnce(second.promise);
      sync.retryPending();
      expect(save).toHaveBeenLastCalledWith("key-a", state(2));

      second.resolve(true);
      return flush().then(() => {
        expect(sync.hasPending()).toBe(false);
      });
    });
  });

  it("clearPending drops the write and stops any further retry", () => {
    const save = jest.fn().mockReturnValue(new Promise(() => {}));
    const sync = createRemoteSync({ save });

    sync.scheduleSave("key-a", state(1));
    sync.clearPending();

    expect(sync.hasPending()).toBe(false);

    sync.retryPending();
    expect(save).toHaveBeenCalledTimes(1); // no new attempt after clearing
  });

  it("scheduling a save for a different key replaces the pending one", () => {
    const first = deferred<boolean>();
    const save = jest.fn().mockReturnValueOnce(first.promise);
    const sync = createRemoteSync({ save });

    sync.scheduleSave("key-a", state(1));
    first.resolve(true);
    return flush().then(() => {
      const second = deferred<boolean>();
      save.mockReturnValueOnce(second.promise);
      sync.scheduleSave("key-b", state(2));

      expect(save).toHaveBeenLastCalledWith("key-b", state(2));
    });
  });
});
