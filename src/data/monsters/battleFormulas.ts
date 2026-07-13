export const ATTACK_COOLDOWN_MS = 60000;
export const WILD_ATTACK_INTERVAL_MS = 10000;
export const WILD_ATTACK_DAMAGE = 1;
export const ATTACK_DAMAGE = 1;
export const PROTAGONIST_MAX_HP = 10;

export const computeWildMaxHp = (capturedCount: number): number =>
  2 * (capturedCount + 1);
