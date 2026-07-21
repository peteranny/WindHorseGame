import { isPassableCell } from "./passability";

const map = [
  [" ", "X", "M", "F"],
];
const monsterIds = [[null, null, 0, null]];

describe("isPassableCell", () => {
  it("is passable for a plain road cell", () => {
    expect(isPassableCell(map, monsterIds, {}, 0, 0)).toBe(true);
  });

  it("is not passable for a wall", () => {
    expect(isPassableCell(map, monsterIds, {}, 0, 1)).toBe(false);
  });

  it("is not passable for an uncaptured monster", () => {
    expect(isPassableCell(map, monsterIds, {}, 0, 2)).toBe(false);
  });

  it("is passable for a captured monster's cell", () => {
    expect(
      isPassableCell(map, monsterIds, { 0: "2024-01-01T00:00:00.000Z" }, 0, 2)
    ).toBe(true);
  });

  it("is not passable for the goal tile, even though it's not a wall", () => {
    expect(isPassableCell(map, monsterIds, {}, 0, 3)).toBe(false);
  });
});
