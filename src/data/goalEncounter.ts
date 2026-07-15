export const GOAL_NAME = "大風大馬";

// First-win-wins, mirroring captureMonster's semantics (see captureLogic.ts) -
// a repeat win of the goal battle never overwrites the date the player first
// beat it.
export const recordGoalWin = (
  goalDefeatedAt: string | null,
  defeatedAt: string
): string => goalDefeatedAt ?? defeatedAt;
