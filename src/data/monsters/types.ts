export interface Monster {
  id: number;
  identifier: string;
  name: string;
  description: string;
  family: "wind" | "horse";
  // The battle-adjacency family - baked into monsters.generated.json
  // (curated groupings, e.g. by shared release batch - not derived from
  // `name` by any rule in code).
  attackFamily: string;
  // Per-adjacent-member damage/heal step - a flat rule, not per-monster
  // data: 1 for healers, 0.1 for everyone else (see monsters.ts).
  attackStep: number;
  icon: string;
  isHealer: boolean;
  healAmount?: number;
}
