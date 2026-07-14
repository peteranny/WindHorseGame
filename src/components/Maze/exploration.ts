export const cellKey = (x: number, y: number): string => `${x},${y}`;

// Movement is always a straight horizontal or vertical line (see goto in
// Maze/index.tsx) - this returns every cell along that line, inclusive of
// both ends, so a single slide through several cells reveals the whole
// stretch rather than just where the player lands.
export const computeTraversedCells = (
  fromX: number,
  fromY: number,
  toX: number,
  toY: number
): Array<[number, number]> => {
  const cells: Array<[number, number]> = [];
  if (fromY === toY) {
    const from = Math.min(fromX, toX);
    const to = Math.max(fromX, toX);
    for (let x = from; x <= to; x++) cells.push([x, fromY]);
  } else if (fromX === toX) {
    const from = Math.min(fromY, toY);
    const to = Math.max(fromY, toY);
    for (let y = from; y <= to; y++) cells.push([fromX, y]);
  } else {
    cells.push([toX, toY]);
  }
  return cells;
};

export const revealCells = (
  explored: Record<string, true>,
  cells: Array<[number, number]>
): Record<string, true> => {
  const next = { ...explored };
  for (const [x, y] of cells) next[cellKey(x, y)] = true;
  return next;
};
