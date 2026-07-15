import React, {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import cn from "classnames";
import styles from "./styles.css";
import SCALE from "../../scale";
import { CELL_SIZE } from "./cellSize";
import simpleMap from "./map.txt";
import { useGameStore } from "../../store/gameStore";
import { useFlowStore } from "../../store/flowStore";
import MONSTERS from "../../data/monsters/monsters";
import { CELL_TYPE, compileMap } from "./compileMap";
import { computeMonsterIds } from "./monsterPositions";
import {
  cellBeforeTarget,
  computeTraversedCells,
  findStoppingPoint,
} from "./exploration";
import { findGoalCell } from "./goalPosition";
import { computeHouseState } from "./houseState";
import {
  extendTrail,
  orderByMostRecentlyCaptured,
  resamplePath,
} from "./followerTrail";
import PLAYER_SPRITE from "../../assets/playerSprite.png";
import PLAYER_SPRITE_FRONT from "../../assets/playerSpriteFront.png";
import PLAYER_SPRITE_BACK from "../../assets/playerSpriteBack.png";
import GOAL_SPRITE from "../../assets/goalSprite.png";
import HOME_SPRITE from "../../assets/home.png";
import HOME_EMPTY_SPRITE from "../../assets/home-empty.png";

// How many cells of the player's own walked path to remember - only needs
// to be long enough to resample every captured monster's follower point
// from (see FOLLOWER_SPACING below), with generous headroom.
const PATH_HISTORY_CELLS = 200;
// Pixel distance between consecutive trailing followers - deliberately much
// smaller than a full cell so the "duckling" line is a compact, continuous
// trail along the actual walked path, not one clump per grid cell.
const FOLLOWER_SPACING = 20 * SCALE;

// Staggered so the hearts drift up one after another rather than all in
// lockstep - each's own left offset and start delay (see .loveSmoke's
// animation in styles.css).
const LOVE_SMOKE_HEARTS = [
  { leftPercent: 35, delayMs: 0 },
  { leftPercent: 50, delayMs: 800 },
  { leftPercent: 65, delayMs: 1600 },
];

interface MazeProps {
  center: [number, number];
}

const Maze = ({ center: [centerX, centerY] }: MazeProps) => {
  const map = useMemo(() => compileMap(simpleMap), []);
  const monsterIds = useMemo(() => computeMonsterIds(map), [map]);
  const goalCell = useMemo(() => findGoalCell(map), [map]);
  const [x, y] = useGameStore((state) => state.position);
  const previousPosition = useGameStore((state) => state.previousPosition);
  const facing = useGameStore((state) => state.facing);
  const setPosition = useGameStore((state) => state.setPosition);
  const setFacing = useGameStore((state) => state.setFacing);
  const revealCells = useGameStore((state) => state.revealCells);
  const captured = useGameStore((state) => state.captured);
  const releaseMonster = useGameStore((state) => state.releaseMonster);
  const goalDefeatedAt = useGameStore((state) => state.goalDefeatedAt);
  const houseState = useMemo(
    () => computeHouseState(goalDefeatedAt, [x, y], goalCell),
    [goalDefeatedAt, x, y, goalCell]
  );
  const flowMode = useFlowStore((state) => state.mode);
  const activeMonsterId = useFlowStore((state) => state.activeMonsterId);
  const isGoalEncounter = useFlowStore((state) => state.isGoalEncounter);
  const talkingSpeaker = useFlowStore((state) => state.talkingSpeaker);
  const startEncounter = useFlowStore((state) => state.startEncounter);
  const startGoalEncounter = useFlowStore((state) => state.startGoalEncounter);
  const devReleaseEnabled = useFlowStore((state) => state.devReleaseEnabled);

  // History of the player's own cell, most recent first - used purely to
  // lay out the trailing captured-monster followers. Only ever seeded (from
  // gameStore.previousPosition) with the one cell the player last moved
  // from, not persisted itself - real movement this session extends it same
  // as before. Without that seed, every follower would stack on the single
  // fallbackFollowerPoint below until the player took their first step.
  const [trail, setTrail] = useState<Array<[number, number]>>(() =>
    previousPosition ? [[x, y], previousPosition] : [[x, y]]
  );

  // Entering the house (see ConversationView's own setPosition call) moves
  // the player's cell without ever going through goto/extendTrail, since
  // it's a teleport rather than a walked step - without this, the trailing
  // followers' path would never learn about it and the whole train would
  // silently desync from the player's actual cell. Extending the trail here
  // the same way a real step would have keeps the closest follower sitting
  // its usual half-cell behind the player, which in practice means right at
  // the doorway rather than inside the house with them.
  const previousHouseStateRef = useRef(houseState);
  useEffect(() => {
    if (
      previousHouseStateRef.current !== "occupied" &&
      houseState === "occupied" &&
      goalCell !== null
    ) {
      setTrail((current) =>
        extendTrail(current, goalCell[0], goalCell[1], PATH_HISTORY_CELLS)
      );
    }
    previousHouseStateRef.current = houseState;
  }, [houseState, goalCell]);

  const isPassable = useCallback(
    (r: number, c: number): boolean => {
      const cell = map[r][c];
      if (cell === CELL_TYPE.ROAD) return true;
      if (cell === CELL_TYPE.WALL) return false;
      const monsterId = monsterIds[r][c];
      return monsterId !== null && captured[monsterId] !== undefined;
    },
    [map, monsterIds, captured]
  );
  const goto = useCallback(
    (r: number, c: number): void => {
      if (flowMode !== "map") return;
      if (r !== y && c !== x) return; // not on a shared row/column
      if (r === y && c === x) return; // tapped the player's own cell

      // Walks as far toward (c, r) as the path actually allows - all the
      // way there if it's clear, otherwise stopping just short of whatever
      // blocks it first (a wall, an uncaptured monster, the goal, ...)
      // rather than refusing to move at all.
      const [stopC, stopR] = findStoppingPoint(isPassable, x, y, c, r);

      if (stopC === x && stopR === y) {
        // Couldn't move even one cell - only meaningful if the tapped cell
        // is itself the (now-adjacent) obstacle; otherwise there's nothing
        // to do (e.g. tapping past a wall/monster that's right next door).
        const [beforeC, beforeR] = cellBeforeTarget(x, y, c, r);
        if (beforeC !== x || beforeR !== y) return;
        const monsterId = monsterIds[r][c];
        const isGoalTile =
          goalCell !== null && c === goalCell[0] && r === goalCell[1];
        if (monsterId !== null && captured[monsterId] === undefined) {
          // Already adjacent - no move happens, so face what's being
          // challenged explicitly rather than leaving the sprite's last
          // travel direction (which may point some other way entirely).
          setFacing(c > x ? "right" : c < x ? "left" : r > y ? "down" : "up");
          startEncounter(monsterId);
        } else if (isGoalTile && r === y && c > x) {
          // Unlike a monster, the goal's own art is fixed facing left, so
          // it can only ever "look at" a player standing to its left -
          // approaching from the right, above, or below still blocks
          // movement like a wall, but doesn't start its conversation.
          setFacing("right");
          startGoalEncounter();
        }
        return;
      }

      revealCells(computeTraversedCells(x, y, stopC, stopR));
      setPosition(stopC, stopR);
      setTrail((current) =>
        extendTrail(current, stopC, stopR, PATH_HISTORY_CELLS)
      );
    },
    [
      flowMode,
      isPassable,
      monsterIds,
      goalCell,
      captured,
      startEncounter,
      startGoalEncounter,
      setPosition,
      setFacing,
      revealCells,
      x,
      y,
    ]
  );

  const orderedFollowerIds = useMemo(
    () => orderByMostRecentlyCaptured(captured),
    [captured]
  );
  // Fine-grained points along the player's actual walked path, nearest
  // first - one per follower, however many that turns out to be, rather
  // than grouping several into shared per-cell slots. The closest follower
  // sits half a cell from the player; every one after that is the tighter
  // FOLLOWER_SPACING further along, keeping the line itself compact. While
  // occupied, trail[0] is the goal cell itself (see the entering effect
  // above), so the train follows the player onto it same as any other cell.
  const followerPoints = useMemo(
    () =>
      resamplePath(
        trail,
        CELL_SIZE,
        FOLLOWER_SPACING,
        orderedFollowerIds.length,
        CELL_SIZE / 2
      ),
    [trail, orderedFollowerIds.length]
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
  const playerCenter: [number, number] = [
    x * CELL_SIZE + CELL_SIZE / 2,
    y * CELL_SIZE + CELL_SIZE / 2,
  ];
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
  const centerRect = {
    left: x * CELL_SIZE,
    top: y * CELL_SIZE,
    width: CELL_SIZE,
    height: CELL_SIZE,
  };
  const [offsetX, offsetY] = [
    centerX - centerRect.width / 2 - centerRect.left,
    centerY - centerRect.height / 2 - centerRect.top,
  ];
  return (
    <div
      className={cn(styles.map, styles.withOffset)}
      style={{
        left: offsetX,
        top: offsetY,
      }}
    >
      {map.map((cells, r) => (
        <div key={r} className={styles.row}>
          {cells.map((cell, c) => {
            const monsterId = monsterIds[r][c];
            const monster = monsterId !== null ? MONSTERS[monsterId] : null;
            const isCaptured =
              monster !== null && captured[monster.id] !== undefined;
            const isMonsterCell = monster !== null && !isCaptured;
            const isGoalCell =
              goalCell !== null && c === goalCell[0] && r === goalCell[1];
            const cellClass = cell === CELL_TYPE.WALL ? "wall" : "road";
            const isBeingTalkedTo =
              flowMode === "conversation" &&
              ((isMonsterCell && monster!.id === activeMonsterId) ||
                (isGoalCell && isGoalEncounter));
            const isTalking = isBeingTalkedTo && talkingSpeaker === "monster";
            return (
              <div
                key={c}
                className={styles.cell}
                style={{
                  minWidth: CELL_SIZE,
                  maxWidth: CELL_SIZE,
                  height: CELL_SIZE,
                }}
                onClick={() => goto(r, c)}
              >
                <div className={cn(styles.cellContent, styles[cellClass])}>
                  {isGoalCell && houseState === "occupied" ? (
                    <img
                      src={HOME_SPRITE}
                      alt="home"
                      className={styles.homeSprite}
                    />
                  ) : (
                    <>
                      {isGoalCell && houseState === "empty" && (
                        <img
                          src={HOME_EMPTY_SPRITE}
                          alt=""
                          aria-hidden="true"
                          className={styles.homeEmptySprite}
                        />
                      )}
                      {(isMonsterCell || isGoalCell) && (
                        <>
                          <div
                            className={cn(
                              styles.footShadow,
                              isGoalCell && styles.aboveHouse
                            )}
                          />
                          <img
                            src={isGoalCell ? GOAL_SPRITE : monster!.icon}
                            alt={isGoalCell ? "goal" : monster!.name}
                            className={cn(
                              styles.monsterIcon,
                              isTalking && styles.talking,
                              isGoalCell && styles.aboveHouse
                            )}
                            style={
                              {
                                // This art is native left-facing - flip only
                                // when the player is to its right, so it faces
                                // the player throughout the conversation.
                                "--facing-scale":
                                  isBeingTalkedTo && x > c ? -1 : 1,
                              } as React.CSSProperties
                            }
                          />
                        </>
                      )}
                    </>
                  )}
                  {isGoalCell && goalDefeatedAt !== null && (
                    <div
                      className={cn(styles.loveSmokeWrap, styles.aboveHouse)}
                      aria-hidden="true"
                    >
                      {LOVE_SMOKE_HEARTS.map(({ leftPercent, delayMs }, i) => (
                        <span
                          key={i}
                          className={styles.loveSmoke}
                          style={{
                            left: `${leftPercent}%`,
                            animationDelay: `${delayMs}ms`,
                          }}
                        >
                          💕
                        </span>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      ))}
      <div className={styles.followerTrail}>
        {orderedFollowerIds.map((id, i) => {
          const [px, py] =
            followerPoints.length > 0
              ? followerPoints[Math.min(i, followerPoints.length - 1)]
              : fallbackFollowerPoint;
          return (
            <div
              key={id}
              className={cn(
                styles.followerWrap,
                devReleaseEnabled && styles.releasable
              )}
              style={{
                left: px,
                top: py,
                zIndex: orderedFollowerIds.length - i,
              }}
              onClick={devReleaseEnabled ? () => releaseMonster(id) : undefined}
            >
              <img
                src={MONSTERS[id].icon}
                alt={MONSTERS[id].name}
                className={styles.followerIcon}
                style={
                  {
                    // Unlike the player's own sprite, monster icon art is
                    // natively left-facing, so it's "right" that needs the flip.
                    "--facing-scale": facing === "right" ? -1 : 1,
                  } as React.CSSProperties
                }
              />
              {devReleaseEnabled && (
                <span
                  className={styles.followerReleaseBadge}
                  aria-hidden="true"
                >
                  ✕
                </span>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
};

interface ContainerProps {
  center: [number, number];
}

const MazeContainer = ({ center: [centerX, centerY] }: ContainerProps) => {
  const map = useMemo(() => compileMap(simpleMap), []);
  const goalCell = useMemo(() => findGoalCell(map), [map]);
  const facing = useGameStore((state) => state.facing);
  const position = useGameStore((state) => state.position);
  const goalDefeatedAt = useGameStore((state) => state.goalDefeatedAt);
  const talkingSpeaker = useFlowStore((state) => state.talkingSpeaker);
  // Once the player's own cell coincides with the goal's, Maze itself draws
  // the combined "occupied house" sprite in that cell - this standalone pin
  // (always centered on the player's current cell) would otherwise draw the
  // player's sprite a second time right on top of it.
  const isInsideHouse =
    computeHouseState(goalDefeatedAt, position, goalCell) === "occupied";
  return (
    <div className={styles.container}>
      <Maze center={[centerX, centerY]} />
      {!isInsideHouse && (
        <div
          className={styles.pin}
          style={{
            width: CELL_SIZE,
            height: CELL_SIZE,
            left: centerX - CELL_SIZE / 2,
            top: centerY - CELL_SIZE / 2,
          }}
        >
          <div className={styles.footShadow} />
          <img
            src={
              facing === "down"
                ? PLAYER_SPRITE_FRONT
                : facing === "up"
                ? PLAYER_SPRITE_BACK
                : PLAYER_SPRITE
            }
            alt="player"
            className={cn(
              styles.playerSprite,
              talkingSpeaker === "protagonist" && styles.talking
            )}
            style={
              {
                // The sprite's native art faces right, so only "left" needs a
                // flip; the dedicated front/back art needs no mirroring.
                "--facing-scale": facing === "left" ? -1 : 1,
              } as React.CSSProperties
            }
          />
        </div>
      )}
    </div>
  );
};

export default MazeContainer;
