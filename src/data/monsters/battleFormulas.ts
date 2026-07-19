export const ATTACK_COOLDOWN_MS = 60000;
export const WILD_ATTACK_INTERVAL_MS = 10000;
export const WILD_ATTACK_DAMAGE = 1;
export const ATTACK_DAMAGE = 1;
export const PROTAGONIST_MAX_HP = 10;
// How long a lost battle locks that same monster (or the goal) out of being
// challenged again - waived entirely once the goal has been cleared once
// (see gameStore.goalDefeatedAt), at which point the game turns casual.
export const BATTLE_LOSS_COOLDOWN_MS = 5 * 60 * 1000;

export const computeWildMaxHp = (capturedCount: number): number =>
  2 * (capturedCount + 1);
