import { computeTraversedCells } from "./exploration";

// Splits an ordered list into at most `groupCount` consecutive chunks, as
// evenly-sized as possible. Used to pack every captured monster into a
// handful of trailing waypoints (a few per waypoint) instead of needing one
// waypoint per monster - keeps a 40-long roster compact instead of a very
// long conga line.
export const distributeFollowers = <T>(
  orderedItems: T[],
  groupCount: number
): T[][] => {
  if (orderedItems.length === 0 || groupCount <= 0) return [];
  const chunkSize = Math.ceil(orderedItems.length / groupCount);
  const groups: T[][] = [];
  for (let i = 0; i < orderedItems.length; i += chunkSize) {
    groups.push(orderedItems.slice(i, i + chunkSize));
  }
  return groups;
};

// Most-recently-captured first, so the first (closest) waypoint gets the
// newest catches.
export const orderByMostRecentlyCaptured = (
  captured: Record<number, string>
): number[] =>
  Object.entries(captured)
    .sort((a, b) => new Date(b[1]).getTime() - new Date(a[1]).getTime())
    .map(([id]) => Number(id));

// Prepends every cell along the step just taken (most-recently-visited
// first) onto the existing trail, then caps it to `maxLength` waypoints -
// the trailing "duckling" clusters render at these positions, most recent
// closest to the player. `computeTraversedCells` always returns cells in
// ascending coordinate order regardless of travel direction, so it's
// reversed here when that doesn't match the actual direction of travel.
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
