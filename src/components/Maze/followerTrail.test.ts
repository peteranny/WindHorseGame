import {
  distributeFollowers,
  extendTrail,
  orderByMostRecentlyCaptured,
} from "./followerTrail";

describe("distributeFollowers", () => {
  it("returns one item per group when there's room for all of them", () => {
    expect(distributeFollowers([1, 2, 3], 8)).toEqual([[1], [2], [3]]);
  });

  it("packs items evenly across the available groups when there are more items than groups", () => {
    const items = Array.from({ length: 13 }, (_, i) => i);
    const groups = distributeFollowers(items, 8);
    expect(groups.length).toBeLessThanOrEqual(8);
    expect(groups.flat()).toEqual(items);
    // ceil(13/8) = 2 per group
    expect(groups[0]).toEqual([0, 1]);
    expect(groups[groups.length - 1].length).toBeLessThanOrEqual(2);
  });

  it("keeps the front groups closest to the front of the input order", () => {
    const groups = distributeFollowers(["a", "b", "c", "d"], 2);
    expect(groups).toEqual([
      ["a", "b"],
      ["c", "d"],
    ]);
  });

  it("returns an empty array when there are no items", () => {
    expect(distributeFollowers([], 8)).toEqual([]);
  });

  it("returns an empty array when there are no groups to fill", () => {
    expect(distributeFollowers([1, 2], 0)).toEqual([]);
  });

  it("never produces more groups than requested, however many items there are", () => {
    const items = Array.from({ length: 40 }, (_, i) => i);
    const groups = distributeFollowers(items, 8);
    expect(groups.length).toBe(8);
    expect(groups.flat()).toEqual(items);
  });
});

describe("orderByMostRecentlyCaptured", () => {
  it("orders monster ids from most to least recently captured", () => {
    const captured = {
      1: "2024-01-01T00:00:00.000Z",
      2: "2024-03-01T00:00:00.000Z",
      3: "2024-02-01T00:00:00.000Z",
    };
    expect(orderByMostRecentlyCaptured(captured)).toEqual([2, 3, 1]);
  });

  it("returns an empty array for no captures", () => {
    expect(orderByMostRecentlyCaptured({})).toEqual([]);
  });
});

describe("extendTrail", () => {
  it("prepends each traversed cell in travel order, most recent first", () => {
    expect(extendTrail([[0, 0]], 3, 0, 10)).toEqual([
      [3, 0],
      [2, 0],
      [1, 0],
      [0, 0],
    ]);
  });

  it("reverses correctly when travelling toward lower coordinates", () => {
    expect(extendTrail([[3, 0]], 0, 0, 10)).toEqual([
      [0, 0],
      [1, 0],
      [2, 0],
      [3, 0],
    ]);
  });

  it("handles vertical movement the same way", () => {
    expect(extendTrail([[5, 0]], 5, 2, 10)).toEqual([
      [5, 2],
      [5, 1],
      [5, 0],
    ]);
  });

  it("is a no-op when the destination equals the current head", () => {
    expect(extendTrail([[2, 2]], 2, 2, 10)).toEqual([[2, 2]]);
  });

  it("caps the result to maxLength, dropping the oldest waypoints", () => {
    const result = extendTrail([[0, 0]], 5, 0, 3);
    expect(result).toEqual([
      [5, 0],
      [4, 0],
      [3, 0],
    ]);
  });

  it("starts from the destination when the trail is empty", () => {
    expect(extendTrail([], 4, 4, 10)).toEqual([[4, 4]]);
  });
});
