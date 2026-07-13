import { describeUnlockCondition, isUnlockConditionMet } from "./unlockCondition";

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

describe("describeUnlockCondition", () => {
  it("describes a weekday condition", () => {
    expect(describeUnlockCondition({ type: "weekday", day: 3 })).toBe(
      "只有在星期三才會出現"
    );
  });

  it("describes a time-of-day condition", () => {
    expect(
      describeUnlockCondition({ type: "timeOfDay", period: "night" })
    ).toBe("只有在晚上10點到隔天早上6點之間才會出現");
  });

  it("describes a date-divisibility condition", () => {
    expect(
      describeUnlockCondition({ type: "dateDivisibleBy", divisor: 3 })
    ).toBe("只有在日期是3的倍數時（3號、6號⋯）才會出現");
  });

  it("describes a date-parity condition", () => {
    expect(
      describeUnlockCondition({ type: "dateParity", parity: "even" })
    ).toBe("只有在日期是偶數時才會出現");
  });
});
