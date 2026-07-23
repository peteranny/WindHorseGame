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
  // Both derived from attackFamily (see monsters.ts), not their own stored
  // data - attackStep is a flat rule (1 for healers, 0.1 for everyone
  // else), and isHealer is just attackFamily === MOM_FAMILY.
  attackStep: number;
  icon: string;
  isHealer: boolean;
  healAmount?: number;
}
