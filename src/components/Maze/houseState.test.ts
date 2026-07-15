import { computeHouseState } from "./houseState";

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
