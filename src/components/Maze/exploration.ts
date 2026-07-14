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

// The cell just before reaching an obstacle (a monster, the goal, ...) at
// (targetX, targetY), coming from (fromX, fromY) along their shared row or
// column - used to walk the player up next to something blocking, one
// `setPosition` call away, whichever kind of obstacle it happens to be.
export const cellBeforeTarget = (
  fromX: number,
  fromY: number,
  targetX: number,
  targetY: number
): [number, number] => {
  const isRow = targetY === fromY;
  const stepY = isRow ? fromY : targetY > fromY ? targetY - 1 : targetY + 1;
  const stepX = isRow ? (targetX > fromX ? targetX - 1 : targetX + 1) : fromX;
  return [stepX, stepY];
};

// Walks from (fromX, fromY) toward (toX, toY) along their shared row or
// column, one cell at a time, and returns the furthest cell actually
// reachable: (toX, toY) itself if every cell up to and including it is
// passable, otherwise the cell just before whatever blocks the way first
// (a wall, an uncaptured monster, the goal, ...) - so tapping a spot past
// an obstacle still walks the player up to it, rather than doing nothing.
// Returns (fromX, fromY) unchanged if the two aren't on a shared line.
export const findStoppingPoint = (
  isPassable: (row: number, col: number) => boolean,
  fromX: number,
  fromY: number,
  toX: number,
  toY: number
): [number, number] => {
  const isRow = toY === fromY;
  if (!isRow && toX !== fromX) return [fromX, fromY];
  const dir = isRow ? Math.sign(toX - fromX) : Math.sign(toY - fromY);
  if (dir === 0) return [fromX, fromY];
  let curX = fromX;
  let curY = fromY;
  while (curX !== toX || curY !== toY) {
    const nextX = isRow ? curX + dir : curX;
    const nextY = isRow ? curY : curY + dir;
    if (!isPassable(nextY, nextX)) return [curX, curY];
    curX = nextX;
    curY = nextY;
  }
  return [curX, curY];
};
