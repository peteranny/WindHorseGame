import { PersistedGameState } from "./types";

describe("PersistedGameState JSON round-trip", () => {
  it("serialises and deserialises without losing data", () => {
    const state: PersistedGameState = {
      position: [4, 7],
      previousPosition: [3, 7],
      facing: "right",
      captured: {
        0: "2024-01-01T00:00:00.000Z",
        12: "2024-03-05T00:00:00.000Z",
      },
      cooldowns: { innate: 1700000000000, 12: 1700000060000 },
      exploredCells: { "4,7": true, "3,7": true },
      goalDefeatedAt: "2024-05-01T00:00:00.000Z",
      timestamp: 1700000000000,
    };

    const roundTripped = JSON.parse(
      JSON.stringify(state)
    ) as PersistedGameState;

    expect(roundTripped).toEqual(state);
    expect(roundTripped.captured[12]).toBe("2024-03-05T00:00:00.000Z");
    expect(roundTripped.cooldowns.innate).toBe(1700000000000);
    expect(roundTripped.exploredCells["4,7"]).toBe(true);
  });
});
