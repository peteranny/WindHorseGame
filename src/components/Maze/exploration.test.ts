import {
  cellBeforeTarget,
  cellKey,
  computeTraversedCells,
  findStoppingPoint,
  revealCells,
} from "./exploration";

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

describe("cellBeforeTarget", () => {
  it("steps toward a target to the right, along the same row", () => {
    expect(cellBeforeTarget(2, 5, 6, 5)).toEqual([5, 5]);
  });

  it("steps toward a target to the left, along the same row", () => {
    expect(cellBeforeTarget(6, 5, 2, 5)).toEqual([3, 5]);
  });

  it("steps toward a target below, along the same column", () => {
    expect(cellBeforeTarget(3, 1, 3, 4)).toEqual([3, 3]);
  });

  it("steps toward a target above, along the same column", () => {
    expect(cellBeforeTarget(3, 4, 3, 1)).toEqual([3, 2]);
  });

  it("is a no-op when already adjacent", () => {
    expect(cellBeforeTarget(4, 5, 5, 5)).toEqual([4, 5]);
  });
});

describe("findStoppingPoint", () => {
  const allPassable = () => true;

  it("reaches the destination when the whole path is clear", () => {
    expect(findStoppingPoint(allPassable, 2, 5, 6, 5)).toEqual([6, 5]);
    expect(findStoppingPoint(allPassable, 3, 1, 3, 4)).toEqual([3, 4]);
  });

  it("stops just before a blocker partway to a further destination", () => {
    // Blocked at column 4 (row 5) - tapping column 6 should stop at 3.
    const isPassable = (row: number, col: number) => !(row === 5 && col === 4);
    expect(findStoppingPoint(isPassable, 2, 5, 6, 5)).toEqual([3, 5]);
  });

  it("stops just before the tapped cell itself when that's the blocker", () => {
    const isPassable = (row: number, col: number) => !(row === 5 && col === 6);
    expect(findStoppingPoint(isPassable, 2, 5, 6, 5)).toEqual([5, 5]);
  });

  it("returns the start unchanged when the very next cell is blocked", () => {
    const isPassable = (row: number, col: number) => !(row === 5 && col === 3);
    expect(findStoppingPoint(isPassable, 2, 5, 6, 5)).toEqual([2, 5]);
  });

  it("works walking in the negative direction too", () => {
    const isPassable = (row: number, col: number) => !(row === 5 && col === 4);
    expect(findStoppingPoint(isPassable, 6, 5, 2, 5)).toEqual([5, 5]);
  });

  it("works along a column", () => {
    const isPassable = (row: number, col: number) => !(row === 3 && col === 3);
    expect(findStoppingPoint(isPassable, 3, 1, 3, 6)).toEqual([3, 2]);
  });

  it("returns the start unchanged when already at the destination", () => {
    expect(findStoppingPoint(allPassable, 4, 4, 4, 4)).toEqual([4, 4]);
  });

  it("returns the start unchanged when not on a shared row or column", () => {
    expect(findStoppingPoint(allPassable, 2, 2, 5, 5)).toEqual([2, 2]);
  });
});
