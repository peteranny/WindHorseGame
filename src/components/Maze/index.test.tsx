/**
 * @jest-environment jsdom
 *
 * zustand's React binding falls back (via use-sync-external-store's shim)
 * to a "no window" degenerate mode that calls getSnapshot() once and never
 * subscribes at all - fine for SSR, but it means a store-driven component
 * never re-renders on a later store update under the project's usual
 * `testEnvironment: "node"`. This file needs jsdom specifically so the
 * component under test actually reacts to teleportTo.
 */
import React from "react";
import TestRenderer, { act } from "react-test-renderer";

// scale.ts pokes document.documentElement at module-load time (to set the
// --scale CSS var) - real under jsdom, but SCALE's actual value doesn't
// matter for these assertions, and mocking it keeps CELL_SIZE predictable
// (cellSize.ts and this file's own SCALE usage both resolve to the same
// module, so one mock covers both).
jest.mock("../../scale", () => ({ __esModule: true, default: 3 }));

// gameStore.ts calls getStateKeyFromUrl() eagerly at module-load time (as
// its initial `stateKey`), which reads `window.location.search` - fine
// under jsdom, but this keeps the seeded state fully under this file's own
// control rather than whatever jsdom's default URL happens to be.
jest.mock("../../store/persistence", () => ({
  ...jest.requireActual("../../store/persistence"),
  getStateKeyFromUrl: () => null,
}));

import MazeContainer from "./index";
import { useGameStore } from "../../store/gameStore";
import { useFlowStore } from "../../store/flowStore";
import { Facing } from "../../store/types";

const CELL_SIZE = 300; // 100 * the mocked SCALE (3) above

// From map.txt (0-indexed row/col), row 1: "XX     M     XXXXX    M     X" -
// road at cols 2-12 (M at 7) and 18-27 (M at 22), wall at cols 13-17.
// teleportTo also updates facing to match travel direction (restored
// separately - see gameStore.ts's facingFromMove), so "behind" for these
// scenarios is whatever a *leftward* teleport (facing becomes "left",
// behind = target x + 1) actually lands on - not whatever facing the
// player happened to have before teleporting.
const WALL_START: [number, number] = [20, 1];
const WALL_TARGET: [number, number] = [12, 1]; // behind (13,1) is a wall
const PASSABLE_START: [number, number] = [10, 1];
const PASSABLE_TARGET: [number, number] = [5, 1]; // behind (6,1) is a road

const seedGameState = (
  position: [number, number],
  facing: Facing,
  monsterIds: number[] = [0]
): void => {
  useGameStore.setState({
    hydrated: false,
    stateKey: null,
    position,
    previousPosition: null,
    facing,
    captured: Object.fromEntries(
      monsterIds.map((id) => [id, "2024-01-01T00:00:00.000Z"])
    ),
    monsterOrder: monsterIds,
    cooldowns: {},
    battleCooldowns: {},
    exploredCells: {},
    goalDefeatedAt: null,
  });
  useFlowStore.setState({
    mode: "map",
    activeMonsterId: null,
    isGoalEncounter: false,
    battleOutcome: null,
    talkingSpeaker: null,
  });
};

// Mirrors exactly what MiniMap's onClick handler does.
const teleport = (x: number, y: number): void => {
  useGameStore.getState().teleportTo(x, y);
};

const findFollowerWrap = (
  renderer: TestRenderer.ReactTestRenderer
): TestRenderer.ReactTestInstance =>
  findFollowerWraps(renderer)[0];

const findFollowerWraps = (
  renderer: TestRenderer.ReactTestRenderer
): TestRenderer.ReactTestInstance[] =>
  renderer.root.findAll(
    (node) =>
      node.type === "div" &&
      typeof node.props.className === "string" &&
      node.props.className.split(" ").includes("followerWrap")
  );

// Mirrors clicking a map cell (Maze's own onClick={() => goto(r, c)}).
const clickCell = (
  renderer: TestRenderer.ReactTestRenderer,
  row: number,
  col: number
): void => {
  const rows = renderer.root.findAll(
    (node) => node.type === "div" && node.props.className === "row"
  );
  const cells = rows[row].findAll(
    (node) => node.type === "div" && node.props.className === "cell"
  );
  cells[col].props.onClick();
};

describe("teleporting the player and the duckling follower", () => {
  let renderer: TestRenderer.ReactTestRenderer | null = null;

  afterEach(() => {
    if (renderer) {
      act(() => {
        renderer!.unmount();
      });
      renderer = null;
    }
  });

  it("snaps the follower onto the player when the behind-cell is a wall", () => {
    seedGameState(WALL_START, "down");
    act(() => {
      renderer = TestRenderer.create(<MazeContainer center={[400, 300]} />);
    });

    act(() => {
      teleport(WALL_TARGET[0], WALL_TARGET[1]);
    });
    // A leftward teleport (WALL_TARGET is left of WALL_START) turns facing
    // "left" (see the facing test below) - confirms behind = (target.x+1, y).
    expect(useGameStore.getState().facing).toBe("left");

    const wrap = findFollowerWrap(renderer!);
    expect(wrap.props.style.left).toBe(
      WALL_TARGET[0] * CELL_SIZE + CELL_SIZE / 2
    );
    expect(wrap.props.style.top).toBe(
      WALL_TARGET[1] * CELL_SIZE + CELL_SIZE / 2
    );
  });

  it("snaps the follower onto the player even when the behind-cell is passable", () => {
    seedGameState(PASSABLE_START, "down");
    act(() => {
      renderer = TestRenderer.create(<MazeContainer center={[400, 300]} />);
    });

    act(() => {
      teleport(PASSABLE_TARGET[0], PASSABLE_TARGET[1]);
    });
    expect(useGameStore.getState().facing).toBe("left");

    // A teleport collapses the whole duckling train onto the player's own
    // cell unconditionally (same as entering the goal's house) - unlike the
    // usual walking fallback, whether the behind-cell happens to be clear
    // doesn't matter here, since a teleport has no "direction arrived from"
    // for a trailing offset to make sense of.
    const wrap = findFollowerWrap(renderer!);
    expect(wrap.props.style.left).toBe(
      PASSABLE_TARGET[0] * CELL_SIZE + CELL_SIZE / 2
    );
    expect(wrap.props.style.top).toBe(
      PASSABLE_TARGET[1] * CELL_SIZE + CELL_SIZE / 2
    );
  });

  it("snaps the follower onto the player on a fresh load right after a teleport, without a live teleport call", () => {
    // Mirrors reloading the page immediately after a mini-map teleport:
    // gameStore.teleportTo persists previousPosition as the same cell as
    // position, so a save carrying that signature must collapse the trail
    // on mount too, not only when teleportTo is actually called live.
    seedGameState(WALL_TARGET, "left");
    useGameStore.setState({ previousPosition: WALL_TARGET });
    act(() => {
      renderer = TestRenderer.create(<MazeContainer center={[400, 300]} />);
    });

    const wrap = findFollowerWrap(renderer!);
    expect(wrap.props.style.left).toBe(
      WALL_TARGET[0] * CELL_SIZE + CELL_SIZE / 2
    );
    expect(wrap.props.style.top).toBe(
      WALL_TARGET[1] * CELL_SIZE + CELL_SIZE / 2
    );
  });

  it("teleporting leftward faces the player left, rightward faces right", () => {
    seedGameState(WALL_START, "down");
    act(() => {
      renderer = TestRenderer.create(<MazeContainer center={[400, 300]} />);
    });

    act(() => {
      teleport(WALL_TARGET[0], WALL_TARGET[1]); // left of WALL_START
    });
    expect(useGameStore.getState().facing).toBe("left");

    act(() => {
      teleport(WALL_START[0], WALL_START[1]); // back to the right
    });
    expect(useGameStore.getState().facing).toBe("right");
  });

  // Row 9 (0-indexed): "X    M    X   M   X    M    X" - road at cols 1-9
  // (M at 5), so (3,9)/(2,9) are both plain, adjacent, passable cells with
  // no monster in between.
  const OFF_ROW_TARGET: [number, number] = [3, 9];

  it("re-anchors the trail on a second teleport landing off the first teleport's row/column, so a walk afterward still extends normally", () => {
    seedGameState(WALL_START, "down", [0, 1]);
    act(() => {
      renderer = TestRenderer.create(<MazeContainer center={[400, 300]} />);
    });

    act(() => {
      teleport(WALL_TARGET[0], WALL_TARGET[1]); // spot A
    });
    act(() => {
      // Spot B, landing off A's row/column - teleportTo always sets
      // previousPosition to match the new position, so isTeleportedInPlace
      // stays true across both teleports with no walk in between. An
      // edge-triggered reset (only on isTeleportedInPlace flipping
      // false->true) would miss this second teleport entirely, leaving the
      // trail anchored at A.
      teleport(OFF_ROW_TARGET[0], OFF_ROW_TARGET[1]);
    });
    act(() => {
      // One step left along B's own row - not on the same row/column as A,
      // so a trail still stuck at A would fail to extend at all (extendTrail
      // silently no-ops when its own start isn't collinear with the walked
      // line), leaving every follower frozen at a single fallback point.
      clickCell(renderer!, OFF_ROW_TARGET[1], OFF_ROW_TARGET[0] - 1);
    });

    const [wrap0, wrap1] = findFollowerWraps(renderer!);
    // A real one-cell walk from B is long enough to place the two closest
    // followers at distinct points along it - if the trail were still stuck
    // at A (non-collinear with this walk), both would instead collapse onto
    // the exact same fallback point.
    expect(wrap0.props.style.left).not.toBe(wrap1.props.style.left);
  });

  // Row 1 (0-indexed), same road segment WALL_TARGET/WALL_START already sit
  // in: cols 23-27 are plain road (M at 22, wall at 28) - SAME_ROW_TARGET is
  // on the same row as WALL_TARGET (A) but a different column, so a walk
  // afterward is (wrongly) collinear with A too if the trail never got
  // re-anchored at B.
  const SAME_ROW_TARGET: [number, number] = [25, 1];

  it("does not extend the trail all the way back to an earlier teleport spot when the second teleport shares its row", () => {
    seedGameState(WALL_START, "down", [0, 1, 2, 3, 4]);
    act(() => {
      renderer = TestRenderer.create(<MazeContainer center={[400, 300]} />);
    });

    act(() => {
      teleport(WALL_TARGET[0], WALL_TARGET[1]); // spot A, col 12
    });
    act(() => {
      teleport(SAME_ROW_TARGET[0], SAME_ROW_TARGET[1]); // spot B, col 25
    });
    act(() => {
      // One step left from B (col 25 -> 24) - a real path of just one cell.
      clickCell(renderer!, SAME_ROW_TARGET[1], SAME_ROW_TARGET[0] - 1);
    });

    // With only ~1 cell of real path, resamplePath can place at most 3 of
    // the 5 followers individually - the rest clamp to that 3rd point (see
    // followerTrail.ts's resamplePath/Maze/index.tsx's own followerPoints
    // comment). If the trail were wrongly stitched all the way back to A
    // (13 cells, col 12 to col 24) instead of stopping at B, there'd be
    // plenty of path to place all 5 individually, and this last follower
    // would sit at its own distinct point instead of sharing the 3rd one's.
    const wraps = findFollowerWraps(renderer!);
    expect(wraps[4].props.style.left).toBe(wraps[2].props.style.left);
    expect(wraps[4].props.style.top).toBe(wraps[2].props.style.top);
  });
});
