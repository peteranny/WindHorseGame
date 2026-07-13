import { isUnlockConditionMet } from "./unlockCondition";

describe("isUnlockConditionMet", () => {
  it("matches the correct weekday", () => {
    const wednesday = new Date("2024-01-03T10:00:00");
    const thursday = new Date("2024-01-04T10:00:00");
    expect(isUnlockConditionMet({ type: "weekday", day: 3 }, wednesday)).toBe(
      true
    );
    expect(isUnlockConditionMet({ type: "weekday", day: 3 }, thursday)).toBe(
      false
    );
  });

  it.each([
    ["morning", 8, true],
    ["morning", 13, false],
    ["afternoon", 15, true],
    ["afternoon", 8, false],
    ["evening", 19, true],
    ["evening", 23, false],
    ["night", 23, true],
    ["night", 3, true],
    ["night", 12, false],
  ] as const)("time-of-day %s at hour %i -> %s", (period, hour, expected) => {
    const date = new Date(2024, 0, 1, hour);
    expect(
      isUnlockConditionMet({ type: "timeOfDay", period }, date)
    ).toBe(expected);
  });

  it("matches date divisibility", () => {
    const ninth = new Date(2024, 0, 9);
    const tenth = new Date(2024, 0, 10);
    expect(
      isUnlockConditionMet({ type: "dateDivisibleBy", divisor: 3 }, ninth)
    ).toBe(true);
    expect(
      isUnlockConditionMet({ type: "dateDivisibleBy", divisor: 3 }, tenth)
    ).toBe(false);
  });

  it("matches date parity", () => {
    const even = new Date(2024, 0, 10);
    const odd = new Date(2024, 0, 11);
    expect(
      isUnlockConditionMet({ type: "dateParity", parity: "even" }, even)
    ).toBe(true);
    expect(
      isUnlockConditionMet({ type: "dateParity", parity: "even" }, odd)
    ).toBe(false);
    expect(
      isUnlockConditionMet({ type: "dateParity", parity: "odd" }, odd)
    ).toBe(true);
  });
});
