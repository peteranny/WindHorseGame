export type Facing = "left" | "right" | "up" | "down";

export interface PersistedGameState {
  position: [number, number];
  previousPosition: [number, number] | null;
  facing: Facing;
  captured: Record<number, string>;
  // Front-to-back order shared by the duckling follower trail and the
  // battle attack line - starts as most-recently-captured-first (see
  // followerTrail.ts's addToOrder), but a battle's own reordering (send to
  // back / bring to front) overwrites it from then on.
  monsterOrder: number[];
  cooldowns: Record<string, number>;
  // Per-monster (id as string) or the goal ("goal") timestamp before which
  // that encounter's battle can't be re-challenged, set on a loss - see
  // battleFormulas.BATTLE_LOSS_COOLDOWN_MS. Distinct from `cooldowns` above,
  // which is the in-battle per-attack cooldown, not a between-battles one.
  battleCooldowns: Record<string, number>;
  exploredCells: Record<string, true>;
  goalDefeatedAt: string | null;
  timestamp: number;
}
