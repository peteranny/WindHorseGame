import { computeWildMaxHp } from "./battleFormulas";

describe("computeWildMaxHp", () => {
  it("starts at 2 for the very first battle (no captures yet)", () => {
    expect(computeWildMaxHp(0)).toBe(2);
  });

  it("scales with capture count", () => {
    expect(computeWildMaxHp(1)).toBe(4);
    expect(computeWildMaxHp(2)).toBe(6);
    expect(computeWildMaxHp(39)).toBe(80);
  });
});
