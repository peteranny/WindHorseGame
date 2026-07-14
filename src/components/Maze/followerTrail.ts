import { computeTraversedCells } from "./exploration";

// Most-recently-captured first, so the first (closest) waypoint gets the
// newest catches.
export const orderByMostRecentlyCaptured = (
  captured: Record<number, string>
): number[] =>
  Object.entries(captured)
    .sort((a, b) => new Date(b[1]).getTime() - new Date(a[1]).getTime())
    .map(([id]) => Number(id));

// Prepends every cell along the step just taken (most-recently-visited
// first) onto the existing trail (the player's own cell-by-cell path, most
// recent first), then caps it to `maxLength` cells. `computeTraversedCells`
// always returns cells in ascending coordinate order regardless of travel
// direction, so it's reversed here when that doesn't match the actual
// direction of travel.
export const extendTrail = (
  trail: Array<[number, number]>,
  toX: number,
  toY: number,
  maxLength: number
): Array<[number, number]> => {
  if (trail.length === 0) return [[toX, toY]];
  const [fromX, fromY] = trail[0];
  const traversed = computeTraversedCells(fromX, fromY, toX, toY);
  const isReversed =
    (fromY === toY && fromX > toX) || (fromX === toX && fromY > toY);
  const inTravelOrder = isReversed ? [...traversed].reverse() : traversed;
  const newCells = inTravelOrder.slice(1).reverse();
  return [...newCells, ...trail].slice(0, maxLength);
};

// Walks the player's cell-by-cell path (most recent first, as produced by
// extendTrail) and samples it at fixed pixel intervals - so followers land
// at fine, continuous points along the actual walked route instead of one
// slot per grid cell, letting a compact, tightly-packed line show most of
// even a large captured roster within view. Returns at most `count` points,
// nearest to the player first; fewer are returned if the walked path so far
// isn't long enough to fill them all. The first point sits `initialGap`
// from the player (defaulting to `spacing` if omitted) - every point after
// that is `spacing` further along, so the two can differ, e.g. to open up
// a bigger gap between the player and the closest follower without also
// spreading the rest of the line out.
export const resamplePath = (
  cellPath: Array<[number, number]>,
  cellSize: number,
  spacing: number,
  count: number,
  initialGap: number = spacing
): Array<[number, number]> => {
  if (cellPath.length < 2 || spacing <= 0 || count <= 0 || initialGap <= 0) {
    return [];
  }
  const toPixel = ([cx, cy]: [number, number]): [number, number] => [
    cx * cellSize + cellSize / 2,
    cy * cellSize + cellSize / 2,
  ];
  const points: Array<[number, number]> = [];
  let cumulative = 0;
  let nextTarget = initialGap;
  for (let i = 0; i < cellPath.length - 1 && points.length < count; i++) {
    const [startX, startY] = toPixel(cellPath[i]);
    const [endX, endY] = toPixel(cellPath[i + 1]);
    const segmentLength = Math.hypot(endX - startX, endY - startY);
    if (segmentLength === 0) continue;
    while (cumulative + segmentLength >= nextTarget && points.length < count) {
      const t = (nextTarget - cumulative) / segmentLength;
      points.push([startX + (endX - startX) * t, startY + (endY - startY) * t]);
      nextTarget += spacing;
    }
    cumulative += segmentLength;
  }
  return points;
};
