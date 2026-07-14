import { captureMonster, isFullyCaptured, releaseMonster } from "./captureLogic";

describe("captureMonster", () => {
  it("records a new capture with its timestamp", () => {
    const result = captureMonster({}, 5, "2024-01-01T00:00:00.000Z");
    expect(result).toEqual({ 5: "2024-01-01T00:00:00.000Z" });
  });

  it("does not duplicate or overwrite an already-captured monster", () => {
    const captured = { 5: "2024-01-01T00:00:00.000Z" };
    const result = captureMonster(captured, 5, "2024-06-01T00:00:00.000Z");
    expect(result).toBe(captured);
    expect(result[5]).toBe("2024-01-01T00:00:00.000Z");
  });

  it("preserves other entries when adding a new one", () => {
    const captured = { 1: "2024-01-01T00:00:00.000Z" };
    const result = captureMonster(captured, 2, "2024-02-01T00:00:00.000Z");
    expect(result).toEqual({
      1: "2024-01-01T00:00:00.000Z",
      2: "2024-02-01T00:00:00.000Z",
    });
  });
});

describe("releaseMonster", () => {
  it("removes a captured monster", () => {
    const captured = { 1: "2024-01-01T00:00:00.000Z", 2: "2024-02-01T00:00:00.000Z" };
    expect(releaseMonster(captured, 1)).toEqual({
      2: "2024-02-01T00:00:00.000Z",
    });
  });

  it("is a no-op for a monster that isn't captured", () => {
    const captured = { 2: "2024-02-01T00:00:00.000Z" };
    const result = releaseMonster(captured, 1);
    expect(result).toBe(captured);
  });
});

describe("isFullyCaptured", () => {
  it("is false when fewer monsters are captured than the total", () => {
    expect(isFullyCaptured({ 0: "x", 1: "x" }, 40)).toBe(false);
  });

  it("is true once every monster is captured", () => {
    const captured = Object.fromEntries(
      Array.from({ length: 40 }, (_, i) => [i, "2024-01-01T00:00:00.000Z"])
    );
    expect(isFullyCaptured(captured, 40)).toBe(true);
  });
});
