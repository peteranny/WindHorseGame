import { findGoalCell } from "./goalPosition";

describe("findGoalCell", () => {
  it("returns the [x, y] of the 'F' tile", () => {
    const map = [
      ["X", "X", "X"],
      ["X", " ", "X"],
      ["X", "F", "X"],
    ];
    expect(findGoalCell(map)).toEqual([1, 2]);
  });

  it("returns null when there's no goal tile", () => {
    const map = [
      ["X", "X", "X"],
      ["X", " ", "X"],
      ["X", "X", "X"],
    ];
    expect(findGoalCell(map)).toBeNull();
  });

  it("finds the first match in scan order when there's more than one", () => {
    const map = [
      ["F", " "],
      [" ", "F"],
    ];
    expect(findGoalCell(map)).toEqual([0, 0]);
  });
});
