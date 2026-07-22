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

const seedGameState = (position: [number, number], facing: Facing): void => {
  useGameStore.setState({
    hydrated: false,
    stateKey: null,
    position,
    previousPosition: null,
    facing,
    captured: { 0: "2024-01-01T00:00:00.000Z" },
    monsterOrder: [0],
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
  renderer.root.findAll(
    (node) =>
      node.type === "div" &&
      typeof node.props.className === "string" &&
      node.props.className.split(" ").includes("followerWrap")
  )[0];

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
});
