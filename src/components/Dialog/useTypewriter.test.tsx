import React from "react";
import TestRenderer, { act } from "react-test-renderer";
import { useTypewriter } from "./useTypewriter";

interface Snapshot {
  text: string;
  isDone: boolean;
  complete: () => void;
}

const Harness = ({
  text,
  onRender,
}: {
  text: string;
  onRender: (snapshot: Snapshot) => void;
}) => {
  const [displayedText, isDone, complete] = useTypewriter(text);
  onRender({ text: displayedText, isDone, complete });
  return null;
};

const renderTypewriter = (initialText: string) => {
  let latest!: Snapshot;
  const onRender = (snapshot: Snapshot) => {
    latest = snapshot;
  };
  let renderer!: TestRenderer.ReactTestRenderer;
  act(() => {
    renderer = TestRenderer.create(
      <Harness text={initialText} onRender={onRender} />
    );
  });
  return {
    get current() {
      return latest;
    },
    rerender: (text: string) => {
      act(() => {
        renderer.update(<Harness text={text} onRender={onRender} />);
      });
    },
  };
};

describe("useTypewriter", () => {
  beforeEach(() => {
    jest.useFakeTimers();
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  it("starts empty and not done", () => {
    const hook = renderTypewriter("abc");
    expect(hook.current.text).toBe("");
    expect(hook.current.isDone).toBe(false);
  });

  it("reveals one character every tick", () => {
    const hook = renderTypewriter("abc");

    act(() => jest.advanceTimersByTime(30));
    expect(hook.current.text).toBe("a");
    expect(hook.current.isDone).toBe(false);

    act(() => jest.advanceTimersByTime(30));
    expect(hook.current.text).toBe("ab");

    act(() => jest.advanceTimersByTime(30));
    expect(hook.current.text).toBe("abc");
    expect(hook.current.isDone).toBe(true);
  });

  it("stays at the full text and does not overshoot once done", () => {
    const hook = renderTypewriter("ab");

    act(() => jest.advanceTimersByTime(1000));

    expect(hook.current.text).toBe("ab");
    expect(hook.current.isDone).toBe(true);
  });

  it("complete() jumps straight to the full text mid-typing", () => {
    const hook = renderTypewriter("hello");

    act(() => jest.advanceTimersByTime(30));
    expect(hook.current.text).toBe("h");

    act(() => hook.current.complete());
    expect(hook.current.text).toBe("hello");
    expect(hook.current.isDone).toBe(true);

    // Further ticks (the interval may still be pending) must not misbehave.
    act(() => jest.advanceTimersByTime(90));
    expect(hook.current.text).toBe("hello");
  });

  it("restarts from scratch when the text changes", () => {
    const hook = renderTypewriter("abc");
    act(() => jest.advanceTimersByTime(90));
    expect(hook.current.text).toBe("abc");

    hook.rerender("xyz");
    expect(hook.current.text).toBe("");
    expect(hook.current.isDone).toBe(false);

    act(() => jest.advanceTimersByTime(30));
    expect(hook.current.text).toBe("x");
  });

  it("treats an empty string as already done", () => {
    const hook = renderTypewriter("");
    expect(hook.current.text).toBe("");
    expect(hook.current.isDone).toBe(true);
  });
});
