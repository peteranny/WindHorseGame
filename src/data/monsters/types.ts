export interface Monster {
  id: number;
  identifier: string;
  name: string;
  description: string;
  family: "wind" | "horse";
  // The battle-adjacency family and its per-adjacent-member damage/heal
  // step - computed at runtime from `name` by computeAttackFamily
  // (data/monsters/attackFamily.ts, see monsters.ts), not stored in
  // monsters.generated.json - unlike `family` above, this is a pure
  // function of the name, so keeping a second, independently-editable copy
  // of it in the data file only risked it drifting out of sync with the
  // actual rule (as it once had).
  attackFamily: string;
  attackStep: number;
  icon: string;
  isHealer: boolean;
  healAmount?: number;
}
