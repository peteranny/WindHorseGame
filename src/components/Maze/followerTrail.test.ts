import {
  extendTrail,
  orderByMostRecentlyCaptured,
  resamplePath,
} from "./followerTrail";

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

describe("resamplePath", () => {
  it("samples fine, evenly-spaced points along the path, nearest first", () => {
    const cellPath: Array<[number, number]> = [
      [10, 0],
      [9, 0],
      [8, 0],
      [7, 0],
      [6, 0],
    ];
    expect(resamplePath(cellPath, 100, 40, 5)).toEqual([
      [1010, 50],
      [970, 50],
      [930, 50],
      [890, 50],
      [850, 50],
    ]);
  });

  it("samples along vertical movement the same way", () => {
    const cellPath: Array<[number, number]> = [
      [0, 3],
      [0, 2],
      [0, 1],
      [0, 0],
    ];
    expect(resamplePath(cellPath, 100, 60, 3)).toEqual([
      [50, 290],
      [50, 230],
      [50, 170],
    ]);
  });

  it("returns fewer than count points when the walked path isn't long enough", () => {
    const cellPath: Array<[number, number]> = [
      [2, 0],
      [1, 0],
      [0, 0],
    ];
    const result = resamplePath(cellPath, 100, 150, 5);
    expect(result).toEqual([[100, 50]]);
  });

  it("returns an empty array when the player hasn't moved yet", () => {
    expect(resamplePath([[5, 5]], 100, 40, 5)).toEqual([]);
  });

  it("returns an empty array for a non-positive spacing or count", () => {
    const cellPath: Array<[number, number]> = [
      [1, 0],
      [0, 0],
    ];
    expect(resamplePath(cellPath, 100, 0, 5)).toEqual([]);
    expect(resamplePath(cellPath, 100, 40, 0)).toEqual([]);
  });
});
