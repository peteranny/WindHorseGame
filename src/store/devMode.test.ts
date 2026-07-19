import { isDevStateKey } from "./devMode";

describe("isDevStateKey", () => {
  it("matches the exact key", () => {
    expect(isDevStateKey("peteranny")).toBe(true);
  });

  it("matches any key that merely contains the substring", () => {
    expect(isDevStateKey("team-peteranny-2")).toBe(true);
  });

  it("rejects unrelated keys", () => {
    expect(isDevStateKey("someone-else")).toBe(false);
  });

  it("rejects null", () => {
    expect(isDevStateKey(null)).toBe(false);
  });
});
