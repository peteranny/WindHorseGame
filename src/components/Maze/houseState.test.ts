import { computeHouseState, isAboveGoalCell } from "./houseState";

describe("computeHouseState", () => {
  it("is 'none' when the goal has never been defeated", () => {
    expect(computeHouseState(null, [5, 5], [5, 5])).toBe("none");
  });

  it("is 'none' when the goal has never been defeated even standing on the goal cell", () => {
    expect(computeHouseState(null, [3, 4], [3, 4])).toBe("none");
  });

  it("is 'none' when there's no goal cell on the map", () => {
    expect(computeHouseState("2024-01-01T00:00:00.000Z", [3, 4], null)).toBe(
      "none"
    );
  });

  it("is 'occupied' when the goal is defeated and the player is standing on the goal cell", () => {
    expect(computeHouseState("2024-01-01T00:00:00.000Z", [3, 4], [3, 4])).toBe(
      "occupied"
    );
  });

  it("is 'empty' when the goal is defeated and the player is elsewhere", () => {
    expect(computeHouseState("2024-01-01T00:00:00.000Z", [3, 5], [3, 4])).toBe(
      "empty"
    );
  });

  it("is 'empty' (not 'occupied') when only the x coordinate matches", () => {
    expect(computeHouseState("2024-01-01T00:00:00.000Z", [3, 9], [3, 4])).toBe(
      "empty"
    );
  });

  it("is 'empty' (not 'occupied') when only the y coordinate matches", () => {
    expect(computeHouseState("2024-01-01T00:00:00.000Z", [9, 4], [3, 4])).toBe(
      "empty"
    );
  });
});

describe("isAboveGoalCell", () => {
  it("is true when the player's row is smaller than the goal's", () => {
    expect(isAboveGoalCell([3, 3], [3, 4])).toBe(true);
  });

  it("is false when the player is on the same row as the goal", () => {
    expect(isAboveGoalCell([3, 4], [3, 4])).toBe(false);
  });

  it("is false when the player's row is larger than the goal's", () => {
    expect(isAboveGoalCell([3, 5], [3, 4])).toBe(false);
  });

  it("is false when there's no goal cell on the map", () => {
    expect(isAboveGoalCell([3, 3], null)).toBe(false);
  });
});
