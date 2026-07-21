import { CELL_TYPE } from "./compileMap";

// Whether (r, c) can be walked onto - plain road, or a monster's cell once
// it's been captured (it then behaves like any other road tile). A wall,
// an uncaptured monster, or the goal tile (its own dedicated "F" character,
// never a plain road/wall) all block. Shared by Maze's own goto/
// findStoppingPoint and MiniMap's teleport-on-tap.
export const isPassableCell = (
  map: string[][],
  monsterIds: (number | null)[][],
  captured: Record<number, string>,
  r: number,
  c: number
): boolean => {
  const cell = map[r][c];
  if (cell === CELL_TYPE.ROAD) return true;
  if (cell === CELL_TYPE.WALL) return false;
  const monsterId = monsterIds[r][c];
  return monsterId !== null && captured[monsterId] !== undefined;
};
