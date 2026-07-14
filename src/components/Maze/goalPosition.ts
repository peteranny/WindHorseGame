// The map's single 'F' ("goal") tile, scanning top-to-bottom/left-to-right
// same as computeMonsterIds - returns null if the map has none.
export const findGoalCell = (map: string[][]): [number, number] | null => {
  for (let r = 0; r < map.length; r++) {
    for (let c = 0; c < map[r].length; c++) {
      if (map[r][c] === "F") return [c, r];
    }
  }
  return null;
};
