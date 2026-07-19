import {
  getLocalSnapshot,
  resolveHydratedState,
  setLocalSnapshot,
} from "./persistence";
import { PersistedGameState } from "./types";

// This project's test environment is plain Node (no jsdom), so localStorage
// isn't a real global here - a minimal in-memory stand-in is enough to
// exercise getLocalSnapshot/setLocalSnapshot's own logic (the key scoping),
// as opposed to the browser's actual storage behavior.
class MemoryStorage {
  private store: Map<string, string>;

  constructor() {
    this.store = new Map<string, string>();
  }

  getItem(key: string): string | null {
    return this.store.has(key) ? this.store.get(key)! : null;
  }

  setItem(key: string, value: string): void {
    this.store.set(key, value);
  }
}

const state = (timestamp: number): PersistedGameState => ({
  position: [1, 1],
  previousPosition: null,
  facing: "left",
  captured: {},
  monsterOrder: [],
  cooldowns: {},
  battleCooldowns: {},
  exploredCells: {},
  goalDefeatedAt: null,
  timestamp,
});

describe("resolveHydratedState", () => {
  it("prefers remote when it is newer than local", () => {
    const local = state(100);
    const remote = state(200);
    expect(resolveHydratedState(local, remote)).toBe(remote);
  });

  it("prefers remote when timestamps are equal", () => {
    const local = state(100);
    const remote = state(100);
    expect(resolveHydratedState(local, remote)).toBe(remote);
  });

  it("prefers local when it is newer than remote", () => {
    const local = state(200);
    const remote = state(100);
    expect(resolveHydratedState(local, remote)).toBe(local);
  });

  it("falls back to remote when there is no local snapshot", () => {
    const remote = state(1);
    expect(resolveHydratedState(null, remote)).toBe(remote);
  });

  it("falls back to local when there is no remote snapshot", () => {
    const local = state(1);
    expect(resolveHydratedState(local, null)).toBe(local);
  });

  it("returns null when neither exists", () => {
    expect(resolveHydratedState(null, null)).toBeNull();
  });
});

describe("getLocalSnapshot / setLocalSnapshot", () => {
  const globalWithStorage = (globalThis as unknown) as {
    localStorage: MemoryStorage;
  };

  beforeEach(() => {
    globalWithStorage.localStorage = new MemoryStorage();
  });

  it("keeps two different keys' snapshots independent", () => {
    setLocalSnapshot("key-a", state(1));
    setLocalSnapshot("key-b", state(2));

    expect(getLocalSnapshot("key-a")).toEqual(state(1));
    expect(getLocalSnapshot("key-b")).toEqual(state(2));
  });

  it("returns null for a key that was never saved", () => {
    setLocalSnapshot("key-a", state(1));

    expect(getLocalSnapshot("key-b")).toBeNull();
  });

  it("switching to a never-before-used key never sees another key's cached snapshot", () => {
    // This is the bug being fixed: a single, unscoped local cache would let
    // a just-saved snapshot from the previous key bleed into a brand new
    // key's hydration, incorrectly beating genuinely fresh remote data.
    setLocalSnapshot("old-key", state(999999));

    expect(getLocalSnapshot("new-key")).toBeNull();
  });
});
