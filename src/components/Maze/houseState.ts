export type HouseState = "none" | "empty" | "occupied";

// Whether the goal cell should render as the occupied house (player
// "inside" - both the player and goal sprites replaced by one combined
// image), the empty house underlay (goal defeated, but the player is
// currently elsewhere), or no house at all (goal never defeated). Since the
// player's position is what's persisted, "occupied" is derived purely from
// the player's current cell matching the goal's - there's no separate
// "inside the house" flag to keep in sync. See the goal tile section of
// CLAUDE.md and Maze/index.tsx's use of this.
export const computeHouseState = (
  goalDefeatedAt: string | null,
  position: [number, number],
  goalCell: [number, number] | null
): HouseState => {
  if (goalDefeatedAt === null || goalCell === null) return "none";
  const [x, y] = position;
  const [goalX, goalY] = goalCell;
  return x === goalX && y === goalY ? "occupied" : "empty";
};

// The house's own sprite overhangs upward past the top of its cell (see
// .homeSprite/.homeEmptySprite in styles.css), so it can visually overlap the
// player pin whenever the player stands in a cell above the goal - the pin
// then needs a lower z-index than the house so the roof draws in front, the
// opposite of every other row where the player pin should win. Row index
// increases downward (see Maze/index.tsx's map.map((cells, r) => ...)), so
// "above" is simply a smaller row than the goal's own.
export const isAboveGoalCell = (
  position: [number, number],
  goalCell: [number, number] | null
): boolean => goalCell !== null && position[1] < goalCell[1];
