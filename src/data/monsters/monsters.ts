import generated from "./monsters.generated.json";
import { Monster } from "./types";
import { MOM_FAMILY } from "./attackFamily";

import icon0 from "./icons/0.png";
import icon1 from "./icons/1.png";
import icon2 from "./icons/2.png";
import icon3 from "./icons/3.png";
import icon4 from "./icons/4.png";
import icon5 from "./icons/5.png";
import icon6 from "./icons/6.png";
import icon7 from "./icons/7.png";
import icon8 from "./icons/8.png";
import icon9 from "./icons/9.png";
import icon10 from "./icons/10.png";
import icon11 from "./icons/11.png";
import icon12 from "./icons/12.png";
import icon13 from "./icons/13.png";
import icon14 from "./icons/14.png";
import icon15 from "./icons/15.png";
import icon16 from "./icons/16.png";
import icon17 from "./icons/17.png";
import icon18 from "./icons/18.png";
import icon19 from "./icons/19.png";
import icon20 from "./icons/20.png";
import icon21 from "./icons/21.png";
import icon22 from "./icons/22.png";
import icon23 from "./icons/23.png";
import icon24 from "./icons/24.png";
import icon25 from "./icons/25.png";
import icon26 from "./icons/26.png";
import icon27 from "./icons/27.png";
import icon28 from "./icons/28.png";
import icon29 from "./icons/29.png";
import icon30 from "./icons/30.png";
import icon31 from "./icons/31.png";
import icon32 from "./icons/32.png";
import icon33 from "./icons/33.png";
import icon34 from "./icons/34.png";
import icon35 from "./icons/35.png";
import icon36 from "./icons/36.png";
import icon37 from "./icons/37.png";
import icon38 from "./icons/38.png";

const ICONS: Record<number, string> = {
  0: icon0,
  1: icon1,
  2: icon2,
  3: icon3,
  4: icon4,
  5: icon5,
  6: icon6,
  7: icon7,
  8: icon8,
  9: icon9,
  10: icon10,
  11: icon11,
  12: icon12,
  13: icon13,
  14: icon14,
  15: icon15,
  16: icon16,
  17: icon17,
  18: icon18,
  19: icon19,
  20: icon20,
  21: icon21,
  22: icon22,
  23: icon23,
  24: icon24,
  25: icon25,
  26: icon26,
  27: icon27,
  28: icon28,
  29: icon29,
  30: icon30,
  31: icon31,
  32: icon32,
  33: icon33,
  34: icon34,
  35: icon35,
  36: icon36,
  37: icon37,
  38: icon38,
};

type MonsterMeta = Omit<Monster, "icon" | "attackStep" | "isHealer">;

// isHealer is just attackFamily === MOM_FAMILY (currently 小風媽/小馬媽,
// the only two members of that family) - not its own stored field, since
// attackFamily already fully determines it. Every family's per-adjacent-
// member step is likewise a flat rule, not per-monster data: 0.1, except
// healers at 1.
const MONSTERS: Monster[] = (generated as MonsterMeta[]).map((meta) => {
  const isHealer = meta.attackFamily === MOM_FAMILY;
  return {
    ...meta,
    icon: ICONS[meta.id],
    isHealer,
    attackStep: isHealer ? 1 : 0.1,
  };
});

export default MONSTERS;
