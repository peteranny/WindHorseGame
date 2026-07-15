import {
  ANIMAL_FAMILY,
  FRUIT_FAMILY,
  MOM_FAMILY,
  PAIR_FAMILY,
  PLANT_FAMILY,
  computeAttackFamily,
} from "./attackFamily";
import generated from "./monsters.generated.json";

const familyOf = (name: string) => computeAttackFamily(name).family;
const stepOf = (name: string) => computeAttackFamily(name).step;

describe("computeAttackFamily", () => {
  it("groups 小風媽/小馬媽 into one healer family", () => {
    expect(familyOf("小風媽")).toBe(MOM_FAMILY);
    expect(familyOf("小馬媽")).toBe(MOM_FAMILY);
    expect(stepOf("小風媽")).toBe(0.5);
  });

  it("groups 小馬小風/小風小馬 into one family", () => {
    expect(familyOf("小馬小風")).toBe(PAIR_FAMILY);
    expect(familyOf("小風小馬")).toBe(PAIR_FAMILY);
    expect(stepOf("小馬小風")).toBe(0.5);
  });

  it("recognizes plant-keyword names regardless of trailing 小風/小馬", () => {
    expect(familyOf("牽牛小馬")).toBe(PLANT_FAMILY);
    expect(familyOf("風車菊企鵝小風")).toBe(PLANT_FAMILY);
    expect(familyOf("月見花小風小馬")).toBe(PLANT_FAMILY);
    expect(stepOf("牽牛小馬")).toBe(0.5);
  });

  it("recognizes animal-keyword names with the smaller 0.2 step", () => {
    expect(familyOf("木木小風")).toBe(ANIMAL_FAMILY);
    expect(familyOf("騾子小馬")).toBe(ANIMAL_FAMILY);
    expect(familyOf("企鵝小風")).toBe(ANIMAL_FAMILY);
    expect(familyOf("銀喉圓尾山雀小風")).toBe(ANIMAL_FAMILY);
    expect(stepOf("木木小風")).toBe(0.2);
  });

  it("recognizes fruit-keyword names", () => {
    expect(familyOf("芭樂葡萄小馬")).toBe(FRUIT_FAMILY);
    expect(familyOf("番茄小風")).toBe(FRUIT_FAMILY);
    expect(stepOf("番茄小風")).toBe(0.5);
  });

  it("prioritizes plant/animal/fruit keywords over the generic 小風/小馬 suffix rule", () => {
    // 風車菊企鵝小風 contains both a plant keyword (風車菊) and an animal
    // keyword (企鵝) - the plant match (checked first) wins.
    expect(familyOf("風車菊企鵝小風")).toBe(PLANT_FAMILY);
  });

  it("falls back to the name with its 小風/小馬 suffix stripped", () => {
    expect(familyOf("電電小馬")).toBe("電電");
    expect(familyOf("電電小風")).toBe("電電");
    expect(familyOf("超能力小馬")).toBe(familyOf("超能力小風"));
    expect(familyOf("Akoke小馬")).toBe("Akoke");
    expect(stepOf("電電小馬")).toBe(0.5);
  });

  it("treats an unrecognized name with no 小風/小馬 suffix as its own family", () => {
    expect(familyOf("神秘生物")).toBe("神秘生物");
  });

  it("is total and deterministic over every real monster name", () => {
    generated.forEach((monster) => {
      const first = computeAttackFamily(monster.name);
      const second = computeAttackFamily(monster.name);
      expect(first.family.length).toBeGreaterThan(0);
      expect(first.step).toBeGreaterThan(0);
      expect(second).toEqual(first);
    });
  });

  it("pairs every generic 小風/小馬 counterpart into the same family", () => {
    // Every "X小馬" wind-horse counterpart in this pack has a matching
    // "X小風" (or vice versa) sharing the same prefix - confirms the
    // suffix-stripping rule actually unifies them as intended.
    const genericPrefixPairs = [
      "電電",
      "草草",
      "水水",
      "火火",
      "超能力",
      "Akoke",
      "龍龍",
      "牡羊座",
      "金牛座",
      "雙子座",
      "巨蟹座",
    ];
    genericPrefixPairs.forEach((prefix) => {
      expect(familyOf(`${prefix}小馬`)).toBe(familyOf(`${prefix}小風`));
    });
  });
});
