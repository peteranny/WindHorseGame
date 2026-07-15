export interface AttackFamily {
  family: string;
  step: number;
}

const DEFAULT_STEP = 0.5;
const ANIMAL_STEP = 0.2;

export const MOM_FAMILY = "小X媽";
export const PAIR_FAMILY = "風馬";
export const PLANT_FAMILY = "植物";
export const ANIMAL_FAMILY = "動物";
export const FRUIT_FAMILY = "水果";

// Exact full-name exceptions - these don't fit the generic "strip the 小風/
//小馬 suffix" rule below (媽 isn't a suffix of that pattern, and the two
// 小X小Y pairs would otherwise land in two different single-character
// families, "小馬" and "小風", rather than sharing one).
const MOM_NAMES = ["小風媽", "小馬媽"];
const PAIR_NAMES = ["小馬小風", "小風小馬"];

// Keyword-based exceptions - matched by substring since several monster
// names splice a themed prefix (plant/animal/fruit) onto an otherwise
// ordinary "X小風"/"X小馬" name.
const PLANT_KEYWORDS = ["風車菊", "牽牛", "月見花"];
const ANIMAL_KEYWORDS = [
  "木木",
  "騾子",
  "鴿子",
  "山斑",
  "銀喉圓尾山",
  "駱駝",
  "小鷹",
  "長頸鹿",
  "企鵝",
];
const FRUIT_KEYWORDS = ["芭樂葡萄", "番茄"];

const SUFFIXES = ["小風", "小馬"];

// Determines a monster's attack family (for adjacency bonuses in battle) and
// the per-adjacent-member damage/heal step from its name, per these rules in
// priority order:
//   1. 小風媽/小馬媽 share one "moms" family (both healers).
//   2. 小馬小風/小風小馬 share one "pair" family.
//   3. Any name containing a plant/animal/fruit keyword joins that family.
//   4. Otherwise, the family is the name with its trailing 小風/小馬 suffix
//      stripped off (e.g. 電電小馬/電電小風 both become family "電電").
//   5. A name matching none of the above is its own single-member family.
export const computeAttackFamily = (name: string): AttackFamily => {
  if (MOM_NAMES.includes(name))
    return { family: MOM_FAMILY, step: DEFAULT_STEP };
  if (PAIR_NAMES.includes(name))
    return { family: PAIR_FAMILY, step: DEFAULT_STEP };
  if (PLANT_KEYWORDS.some((keyword) => name.includes(keyword)))
    return { family: PLANT_FAMILY, step: DEFAULT_STEP };
  if (ANIMAL_KEYWORDS.some((keyword) => name.includes(keyword)))
    return { family: ANIMAL_FAMILY, step: ANIMAL_STEP };
  if (FRUIT_KEYWORDS.some((keyword) => name.includes(keyword)))
    return { family: FRUIT_FAMILY, step: DEFAULT_STEP };
  const suffix = SUFFIXES.find((candidate) => name.endsWith(candidate));
  if (suffix)
    return { family: name.slice(0, -suffix.length), step: DEFAULT_STEP };
  return { family: name, step: DEFAULT_STEP };
};
