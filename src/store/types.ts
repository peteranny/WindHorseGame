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
  exploredCells: Record<string, true>;
  goalDefeatedAt: string | null;
  timestamp: number;
}
