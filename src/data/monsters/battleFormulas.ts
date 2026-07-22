export const ATTACK_COOLDOWN_MS = 60000;
export const WILD_ATTACK_INTERVAL_MS = 10000;
export const WILD_ATTACK_DAMAGE = 1;
export const ATTACK_DAMAGE = 1;
export const PROTAGONIST_MAX_HP = 10;
// How long a lost battle locks that same monster (or the goal) out of being
// challenged again - waived entirely once the goal has been cleared once
// (see gameStore.goalDefeatedAt), at which point the game turns casual.
export const BATTLE_LOSS_COOLDOWN_MS = 5 * 60 * 1000;
// Goal-battle-only boss mechanic (see Battle/index.tsx's wild-attack effect):
// every this-many spits at the player, a coldnoodle appears beside the goal
// instead and heals for GOAL_SELF_HEAL_PERCENT of its own max HP.
export const GOAL_SELF_HEAL_INTERVAL_SPITS = 3;
export const GOAL_SELF_HEAL_PERCENT = 0.1;
// Any wild monster with Monster.isHealer set (currently 小風媽/小馬媽) gets
// this same "every N spits, heal instead" mechanic while it's still the
// enemy (before capture) - a much smaller, no-frills version of the goal's
// own boss mechanic above (no coldnoodle side dish, just the plain heal
// glow), since this applies to any healer monster's fight, not one boss.
export const HEALER_ENEMY_SELF_HEAL_INTERVAL_SPITS = 1;
export const HEALER_ENEMY_SELF_HEAL_PERCENT = 0.02;

export const computeWildMaxHp = (capturedCount: number): number =>
  2 * (capturedCount + 1);
