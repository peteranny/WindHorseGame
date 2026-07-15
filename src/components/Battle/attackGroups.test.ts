import {
  findGroupContaining,
  groupByAdjacentFamily,
  groupMultiplierAt,
  hueForFamily,
  moveGroupToBack,
  moveGroupToFront,
} from "./attackGroups";

const member = (key: string, family: string | null, step = 0.5) => ({
  key,
  family,
  step,
});

describe("groupByAdjacentFamily", () => {
  it("returns nothing for an empty line", () => {
    expect(groupByAdjacentFamily([])).toEqual([]);
  });

  it("puts a single member in its own group", () => {
    const a = member("a", "wind");
    expect(groupByAdjacentFamily([a])).toEqual([[a]]);
  });

  it("merges consecutive members of the same family into one group", () => {
    const a = member("a", "wind");
    const b = member("b", "wind");
    const c = member("c", "wind");
    expect(groupByAdjacentFamily([a, b, c])).toEqual([[a, b, c]]);
  });

  it("splits at a family boundary", () => {
    const a = member("a", "wind");
    const b = member("b", "horse");
    expect(groupByAdjacentFamily([a, b])).toEqual([[a], [b]]);
  });

  it("does not merge the same family across a gap of a different family (A,B,A)", () => {
    const a1 = member("a1", "wind");
    const b = member("b", "horse");
    const a2 = member("a2", "wind");
    expect(groupByAdjacentFamily([a1, b, a2])).toEqual([[a1], [b], [a2]]);
  });

  it("never merges a null-family member with its neighbors, even if they share a family", () => {
    const innate = member("innate", null);
    const a = member("a", "wind");
    const b = member("b", "wind");
    expect(groupByAdjacentFamily([a, innate, b])).toEqual([[a], [innate], [b]]);
  });
});

describe("groupMultiplierAt", () => {
  it("computes the 1, 1.5, 2... sequence for step 0.5", () => {
    expect(groupMultiplierAt(0.5, 0)).toBe(1);
    expect(groupMultiplierAt(0.5, 1)).toBe(1.5);
    expect(groupMultiplierAt(0.5, 2)).toBe(2);
  });

  it("computes the 1, 1.2, 1.4... sequence for step 0.2", () => {
    expect(groupMultiplierAt(0.2, 0)).toBe(1);
    expect(groupMultiplierAt(0.2, 1)).toBeCloseTo(1.2);
    expect(groupMultiplierAt(0.2, 2)).toBeCloseTo(1.4);
  });
});

describe("findGroupContaining", () => {
  it("returns the whole adjacent-family run regardless of which member is tapped", () => {
    const a = member("a", "wind");
    const b = member("b", "wind");
    const c = member("c", "wind");
    const line = [a, b, c];
    expect(findGroupContaining(line, "a")).toEqual([a, b, c]);
    expect(findGroupContaining(line, "b")).toEqual([a, b, c]);
    expect(findGroupContaining(line, "c")).toEqual([a, b, c]);
  });

  it("returns just the tapped member when it has no family", () => {
    const innate = member("innate", null);
    const a = member("a", "wind");
    expect(findGroupContaining([innate, a], "innate")).toEqual([innate]);
  });

  it("does not pull in a same-family member from beyond a family boundary", () => {
    const a = member("a", "wind");
    const b = member("b", "horse");
    const c = member("c", "wind");
    expect(findGroupContaining([a, b, c], "a")).toEqual([a]);
  });

  it("returns an empty array for a key not present in the line", () => {
    const a = member("a", "wind");
    expect(findGroupContaining([a], "missing")).toEqual([]);
  });
});

describe("moveGroupToBack", () => {
  it("moves a single member to the back, preserving the rest's order", () => {
    const a = member("a", "wind");
    const b = member("b", "horse");
    const c = member("c", "plant");
    const result = moveGroupToBack([a, b, c], [a]);
    expect(result.map((m) => m.key)).toEqual(["b", "c", "a"]);
  });

  it("moves a whole group to the back as a block, preserving both orders", () => {
    const a = member("a", "wind");
    const b = member("b", "wind");
    const c = member("c", "horse");
    const d = member("d", "plant");
    const result = moveGroupToBack([a, b, c, d], [a, b]);
    expect(result.map((m) => m.key)).toEqual(["c", "d", "a", "b"]);
  });

  it("is a no-op in relative terms when the group is already at the back", () => {
    const a = member("a", "wind");
    const b = member("b", "horse");
    const result = moveGroupToBack([a, b], [b]);
    expect(result.map((m) => m.key)).toEqual(["a", "b"]);
  });
});

describe("moveGroupToFront", () => {
  it("moves a single member to the front, preserving the rest's order", () => {
    const a = member("a", "wind");
    const b = member("b", "horse");
    const c = member("c", "plant");
    const result = moveGroupToFront([a, b, c], [c]);
    expect(result.map((m) => m.key)).toEqual(["c", "a", "b"]);
  });

  it("moves a whole group to the front as a block, preserving both orders", () => {
    const a = member("a", "wind");
    const b = member("b", "horse");
    const c = member("c", "plant");
    const d = member("d", "plant");
    const result = moveGroupToFront([a, b, c, d], [c, d]);
    expect(result.map((m) => m.key)).toEqual(["c", "d", "a", "b"]);
  });

  it("is a no-op in relative terms when the group is already at the front", () => {
    const a = member("a", "wind");
    const b = member("b", "horse");
    const result = moveGroupToFront([a, b], [a]);
    expect(result.map((m) => m.key)).toEqual(["a", "b"]);
  });
});

describe("hueForFamily", () => {
  const families = [
    "plant",
    "animal",
    "fruit",
    "小X媽",
    "小X小Y",
    "電電",
    "草草",
    "水水",
    "火火",
  ];

  it("is deterministic for the same family name", () => {
    expect(hueForFamily("plant", families)).toBe(
      hueForFamily("plant", families)
    );
  });

  it("stays within the 0-359 hue range", () => {
    families.forEach((family) => {
      const hue = hueForFamily(family, families);
      expect(hue).toBeGreaterThanOrEqual(0);
      expect(hue).toBeLessThan(360);
    });
  });

  it("differs for every family, evenly spaced by position in the list", () => {
    const hues = families.map((family) => hueForFamily(family, families));
    expect(new Set(hues).size).toBe(families.length);
    // Evenly spaced around the wheel - every gap between consecutive
    // families is the same size, guaranteeing maximum separation.
    const step = 360 / families.length;
    hues.forEach((hue, index) => {
      expect(hue).toBeCloseTo(index * step, 0);
    });
  });

  it("is stable regardless of where the family sits in a differently-ordered list", () => {
    const reversed = [...families].reverse();
    expect(hueForFamily("電電", reversed)).toBe(
      Math.round((reversed.indexOf("電電") * 360) / reversed.length)
    );
  });

  it("returns 0 for a family missing from the list, rather than throwing", () => {
    expect(hueForFamily("不存在", families)).toBe(0);
  });
});
