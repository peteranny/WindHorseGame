export interface Monster {
  id: number;
  identifier: string;
  name: string;
  description: string;
  family: "wind" | "horse";
  // The battle-adjacency family (see data/monsters/attackFamily.ts) and its
  // per-adjacent-member damage/heal step - baked into monsters.generated.json
  // rather than computed at runtime, same as `family` above.
  attackFamily: string;
  attackStep: number;
  icon: string;
  isHealer: boolean;
  healAmount?: number;
}
