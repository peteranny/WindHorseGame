import { recordGoalWin } from "./goalEncounter";

describe("recordGoalWin", () => {
  it("records the win date when the goal hasn't been beaten yet", () => {
    expect(recordGoalWin(null, "2024-01-01T00:00:00.000Z")).toBe(
      "2024-01-01T00:00:00.000Z"
    );
  });

  it("does not overwrite the first win date on a later win", () => {
    expect(
      recordGoalWin("2024-01-01T00:00:00.000Z", "2024-06-01T00:00:00.000Z")
    ).toBe("2024-01-01T00:00:00.000Z");
  });
});
