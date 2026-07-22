import { useEffect, useMemo, useRef, useState } from "react";
import SCALE from "../../scale";
import { CELL_SIZE } from "./cellSize";
import { Facing } from "../../store/types";
import { HouseState } from "./houseState";
import { extendTrail, resamplePath } from "./followerTrail";

// How many cells of the player's own walked path to remember - only needs
// to be long enough to resample every captured monster's follower point
// from (see FOLLOWER_SPACING below), with generous headroom.
const PATH_HISTORY_CELLS = 200;
// Pixel distance between consecutive trailing followers - deliberately much
// smaller than a full cell so the "duckling" line is a compact, continuous
// trail along the actual walked path, not one clump per grid cell.
const FOLLOWER_SPACING = 20 * SCALE;

interface UseFollowerTrailParams {
  x: number;
  y: number;
  previousPosition: [number, number] | null;
  houseState: HouseState;
  goalCell: [number, number] | null;
  facing: Facing;
  isPassable: (r: number, c: number) => boolean;
  map: string[][];
  followerCount: number;
}

interface UseFollowerTrailResult {
  // Fine-grained points along the player's actual walked path, nearest
  // first - one per follower, however many that turns out to be, rather
  // than grouping several into shared per-cell slots.
  followerPoints: Array<[number, number]>;
  // Shared fallback point every follower collapses onto whenever
  // followerPoints is empty (not enough walked path to resample from yet).
  noPathFollowerPoint: [number, number];
  // Call after a real walked move (goto) lands on (stopC, stopR) - extends
  // the underlying path history by whatever cells were actually traversed.
  extendFollowerTrail: (stopC: number, stopR: number) => void;
}

// Owns the trailing captured-monster followers' whole layout: the player's
// own walked-path history (seeded from gameStore.previousPosition, extended
// on every real move, and collapsed to a single point on entering the house
// or teleporting - see the effects below), resampled into fine, evenly
// -spaced pixel points, plus the fallback point every follower shares
// whenever that path isn't long enough to place them individually.
export const useFollowerTrail = ({
  x,
  y,
  previousPosition,
  houseState,
  goalCell,
  facing,
  isPassable,
  map,
  followerCount,
}: UseFollowerTrailParams): UseFollowerTrailResult => {
  // previousPosition equal to the current position marks the one thing
  // that's never true of an ordinary walked step: a mini-map teleport (see
  // gameStore.ts's teleportTo, the only action that sets previousPosition
  // to the very cell it also moves to). A save loaded right after one
  // carries that signature over as-is, so this doubles as a "was the
  // player's last move here a teleport" check without needing any extra,
  // separately-persisted state to tell the two apart.
  const isTeleportedInPlace =
    previousPosition !== null &&
    previousPosition[0] === x &&
    previousPosition[1] === y;

  // History of the player's own cell, most recent first - used purely to
  // lay out the trailing captured-monster followers. Only ever seeded (from
  // gameStore.previousPosition) with the one cell the player last moved
  // from, not persisted itself - real movement this session extends it same
  // as before. Without that seed, every follower would stack on the single
  // fallbackFollowerPoint below until the player took their first step.
  //
  // A save made while already "in the house", or right after a mini-map
  // teleport, is the exception: entering the house is also a teleport-like
  // jump (see the houseState effect below), so previousPosition there is
  // still whatever cell the player last walked in from - a cell outside
  // the house (or, for a teleport, the same cell, but extendTrail's
  // single-step assumption doesn't apply to either). Seeding the trail as
  // usual would spread the duckling train between that cell and the
  // landing cell on load, instead of every follower starting bunched right
  // there like a live entry/teleport does - so this mirrors that
  // single-cell reset up front.
  const [trail, setTrail] = useState<Array<[number, number]>>(() =>
    houseState === "occupied" || isTeleportedInPlace
      ? [[x, y]]
      : previousPosition
      ? [[x, y], previousPosition]
      : [[x, y]]
  );

  // Entering the house (see ConversationView's own setPosition call) moves
  // the player's cell without ever going through goto/extendTrail, since
  // it's a teleport rather than a walked step. Rather than extending the
  // existing trail, this resets it to just the house's own cell - collapsing
  // the whole duckling train onto that single point (resamplePath needs at
  // least 2 cells to place anyone individually, so every follower falls back
  // to the same shared point below) rather than spreading it out along the
  // old path. Leaving is then an entirely ordinary goto/extendTrail walk
  // starting fresh from that single-cell trail, so only as many followers as
  // the walked-so-far path can fit get their own point - the rest stay
  // clamped to the last one (still right at the house) until the player's
  // put enough distance between them for the whole train to have "emerged".
  const previousHouseStateRef = useRef(houseState);
  useEffect(() => {
    if (
      previousHouseStateRef.current !== "occupied" &&
      houseState === "occupied" &&
      goalCell !== null
    ) {
      setTrail([[goalCell[0], goalCell[1]]]);
    }
    previousHouseStateRef.current = houseState;
  }, [houseState, goalCell]);

  // A mini-map tap teleports the player straight to a (non-adjacent, often
  // diagonal) cell rather than walking there - extendTrail only makes sense
  // for the single-step-at-a-time path goto itself produces, so this instead
  // collapses the trail onto the new cell outright, exactly like entering
  // the goal's house above. Keyed off the trail not already starting at the
  // current cell rather than an isTeleportedInPlace false->true edge - two
  // teleports in a row (no walk in between) both leave isTeleportedInPlace
  // true throughout, so an edge check would only catch the first one and
  // leave the trail permanently anchored at that first destination, unable
  // to ever extend again once the player starts walking from the second
  // (extendTrail silently no-ops when its own fromX/fromY isn't on the
  // walked line's row/column). Ordinary walking right after just
  // re-extends the trail from that single point same as it would fresh out
  // of the house.
  useEffect(() => {
    if (
      isTeleportedInPlace &&
      (trail.length !== 1 || trail[0][0] !== x || trail[0][1] !== y)
    ) {
      setTrail([[x, y]]);
    }
  }, [isTeleportedInPlace, x, y, trail]);

  // The closest follower sits half a cell from the player; every one after
  // that is the tighter FOLLOWER_SPACING further along, keeping the line
  // itself compact. While occupied, trail[0] is the goal cell itself (see
  // the entering effect above), so the train follows the player onto it
  // exactly like any other cell.
  const followerPoints = useMemo(
    () =>
      resamplePath(
        trail,
        CELL_SIZE,
        FOLLOWER_SPACING,
        followerCount,
        CELL_SIZE / 2
      ),
    [trail, followerCount]
  );

  // Before the player has taken a single step this session, the path isn't
  // long enough to resample from at all - fall back to half a cell behind
  // the player (opposite their facing), consistent with where the closest
  // follower sits once there's an actual path to place it on.
  const [behindX, behindY] =
    facing === "right"
      ? [x - 1, y]
      : facing === "left"
      ? [x + 1, y]
      : facing === "down"
      ? [x, y - 1]
      : [x, y + 1];
  const isBehindPassable =
    behindY >= 0 &&
    behindY < map.length &&
    behindX >= 0 &&
    behindX < map[behindY].length &&
    isPassable(behindY, behindX);
  const playerCenter: [number, number] = useMemo(
    () => [x * CELL_SIZE + CELL_SIZE / 2, y * CELL_SIZE + CELL_SIZE / 2],
    [x, y]
  );
  // Half a cell back, matching resamplePath's own initialGap - not the
  // full cell (the behind cell's own center), which would visibly jump
  // once real movement starts populating followerPoints instead.
  const behindFollowerPoint: [number, number] =
    facing === "right"
      ? [playerCenter[0] - CELL_SIZE / 2, playerCenter[1]]
      : facing === "left"
      ? [playerCenter[0] + CELL_SIZE / 2, playerCenter[1]]
      : facing === "down"
      ? [playerCenter[0], playerCenter[1] - CELL_SIZE / 2]
      : [playerCenter[0], playerCenter[1] + CELL_SIZE / 2];
  // That behind cell might be a wall or an uncaptured monster though
  // (nothing guarantees the player's *back* is clear) - rather than
  // snapping the train onto the player's own cell whenever that happens
  // (most noticeably when only turning to face something, with no actual
  // move), it holds at wherever it last had a clear cell to sit in.
  const lastPassableFollowerPointRef = useRef(behindFollowerPoint);
  if (isBehindPassable) {
    lastPassableFollowerPointRef.current = behindFollowerPoint;
  }
  const fallbackFollowerPoint = lastPassableFollowerPointRef.current;
  // While occupied (the house) or just teleported-in-place (the mini-map,
  // see isTeleportedInPlace above), the whole train collapses onto this
  // same player-center point instead of fallbackFollowerPoint's usual
  // half-cell-behind offset - a teleport has no "direction arrived from"
  // for that offset to trail behind, and hugging the doorway edge would
  // look wrong for the house case specifically.
  const noPathFollowerPoint =
    houseState === "occupied" || isTeleportedInPlace
      ? playerCenter
      : fallbackFollowerPoint;

  const extendFollowerTrail = (stopC: number, stopR: number): void => {
    setTrail((current) =>
      extendTrail(current, stopC, stopR, PATH_HISTORY_CELLS)
    );
  };

  return { followerPoints, noPathFollowerPoint, extendFollowerTrail };
};
