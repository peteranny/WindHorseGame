export interface PersistedGameState {
  position: [number, number];
  captured: Record<number, string>;
  cooldowns: Record<string, number>;
  timestamp: number;
}
