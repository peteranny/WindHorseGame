import { Dispatch, SetStateAction, useState } from "react";
import MONSTERS from "../../data/monsters/monsters";
import PLAYER_SPRITE from "../../assets/playerSprite.png";

export const INNATE_KEY = "innate";

export interface AttackOption {
  key: string;
  label: string;
  icon: string;
  isHealer: boolean;
  healAmount: number;
  // The battle-adjacency family/step (see data/monsters/attackFamily.ts) -
  // null family for the innate attack, which never groups with a neighbor.
  family: string | null;
  step: number;
}

export const buildLine = (order: number[]): AttackOption[] => {
  const options: AttackOption[] = [
    {
      key: INNATE_KEY,
      label: "小風溥儀",
      icon: PLAYER_SPRITE,
      isHealer: false,
      healAmount: 0,
      family: null,
      step: 0,
    },
  ];
  order.forEach((id) => {
    const monster = MONSTERS[id];
    options.push({
      key: String(id),
      label: monster.name,
      icon: monster.icon,
      isHealer: monster.isHealer,
      healAmount: monster.healAmount ?? 0,
      family: monster.attackFamily,
      step: monster.attackStep,
    });
  });
  return options;
};

// The attack line's order - starts as the innate attack first, then
// gameStore.monsterOrder (shared with, and reorderable from, the map's own
// duckling trail - see store/types.ts), but from here on the innate
// attack is just as reorderable as any captured monster (tapping it sends
// it to the back/front of the line same as anything else). Its own
// position is never persisted, though - a fresh battle always starts it
// back at the front, so this is local state, only the captured-monster
// portion syncs out to reorderMonsters on every reorder (Battle/index.tsx's
// handleAttack).
export const useAttackLine = (
  monsterOrder: number[]
): [AttackOption[], Dispatch<SetStateAction<AttackOption[]>>] =>
  useState<AttackOption[]>(() => buildLine(monsterOrder));
