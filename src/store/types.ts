export type Facing = "left" | "right" | "up" | "down";

export interface PersistedGameState {
  position: [number, number];
  facing: Facing;
  captured: Record<number, string>;
  cooldowns: Record<string, number>;
  exploredCells: Record<string, true>;
  timestamp: number;
}
