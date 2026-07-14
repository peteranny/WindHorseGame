import { cellKey, computeTraversedCells, revealCells } from "./exploration";

describe("computeTraversedCells", () => {
  it("includes every cell along a horizontal move, in either direction", () => {
    expect(computeTraversedCells(2, 5, 6, 5)).toEqual([
      [2, 5],
      [3, 5],
      [4, 5],
      [5, 5],
      [6, 5],
    ]);
    expect(computeTraversedCells(6, 5, 2, 5)).toEqual([
      [2, 5],
      [3, 5],
      [4, 5],
      [5, 5],
      [6, 5],
    ]);
  });

  it("includes every cell along a vertical move, in either direction", () => {
    expect(computeTraversedCells(3, 1, 3, 4)).toEqual([
      [3, 1],
      [3, 2],
      [3, 3],
      [3, 4],
    ]);
    expect(computeTraversedCells(3, 4, 3, 1)).toEqual([
      [3, 1],
      [3, 2],
      [3, 3],
      [3, 4],
    ]);
  });

  it("returns just the single cell when start and end are the same", () => {
    expect(computeTraversedCells(2, 2, 2, 2)).toEqual([[2, 2]]);
  });
});

describe("revealCells", () => {
  it("marks the given cells as explored", () => {
    const result = revealCells({}, [
      [1, 1],
      [1, 2],
    ]);
    expect(result).toEqual({
      [cellKey(1, 1)]: true,
      [cellKey(1, 2)]: true,
    });
  });

  it("preserves previously explored cells", () => {
    const before = { [cellKey(0, 0)]: true as const };
    const result = revealCells(before, [[1, 1]]);
    expect(result).toEqual({
      [cellKey(0, 0)]: true,
      [cellKey(1, 1)]: true,
    });
  });

  it("does not duplicate or remove an already-explored cell", () => {
    const before = { [cellKey(1, 1)]: true as const };
    const result = revealCells(before, [[1, 1]]);
    expect(result).toEqual({ [cellKey(1, 1)]: true });
  });

  it("does not mutate the input record", () => {
    const before = { [cellKey(0, 0)]: true as const };
    revealCells(before, [[1, 1]]);
    expect(before).toEqual({ [cellKey(0, 0)]: true });
  });
});
