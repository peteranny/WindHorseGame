export type Facing = "left" | "right";

export interface PersistedGameState {
  position: [number, number];
  facing: Facing;
  captured: Record<number, string>;
  cooldowns: Record<string, number>;
  exploredCells: Record<string, true>;
  timestamp: number;
}
