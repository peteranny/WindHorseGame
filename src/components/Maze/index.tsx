import React, { useCallback, useMemo, useState } from "react";
import cn from "classnames";
import styles from "./styles.css";
import SCALE from "../../scale";
import simpleMap from "./map.txt";
import { useGameStore } from "../../store/gameStore";
import { useFlowStore } from "../../store/flowStore";
import MONSTERS from "../../data/monsters/monsters";
import { CELL_TYPE, compileMap } from "./compileMap";
import { computeMonsterIds } from "./monsterPositions";
import { computeTraversedCells } from "./exploration";
import {
  extendTrail,
  orderByMostRecentlyCaptured,
  resamplePath,
} from "./followerTrail";
import { PLAYER_SPRITE } from "../../assets/playerSprite.generated";
import { PLAYER_SPRITE_FRONT } from "../../assets/playerSpriteFront.generated";
import { PLAYER_SPRITE_BACK } from "../../assets/playerSpriteBack.generated";

const CELL_SIZE = 100 * SCALE;
// How many cells of the player's own walked path to remember - only needs
// to be long enough to resample every captured monster's follower point
// from (see FOLLOWER_SPACING below), with generous headroom.
const PATH_HISTORY_CELLS = 200;
// Pixel distance between consecutive trailing followers - deliberately much
// smaller than a full cell so the "duckling" line is a compact, continuous
// trail along the actual walked path, not one clump per grid cell.
const FOLLOWER_SPACING = 20 * SCALE;

interface MazeProps {
  center: [number, number];
}

const Maze = ({ center: [centerX, centerY] }: MazeProps) => {
  const map = useMemo(() => compileMap(simpleMap), []);
  const monsterIds = useMemo(() => computeMonsterIds(map), [map]);
  const [x, y] = useGameStore((state) => state.position);
  const facing = useGameStore((state) => state.facing);
  const setPosition = useGameStore((state) => state.setPosition);
  const revealCells = useGameStore((state) => state.revealCells);
  const captured = useGameStore((state) => state.captured);
  const flowMode = useFlowStore((state) => state.mode);
  const activeMonsterId = useFlowStore((state) => state.activeMonsterId);
  const talkingSpeaker = useFlowStore((state) => state.talkingSpeaker);
  const startEncounter = useFlowStore((state) => state.startEncounter);

  // Ephemeral (not persisted) history of the player's own cell, most recent
  // first - used purely to lay out the trailing captured-monster followers,
  // which reset every session same as any other transient UI state.
  const [trail, setTrail] = useState<Array<[number, number]>>(() => [[x, y]]);

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
  const isReachableAt = useCallback(
    (r: number, c: number): boolean => {
      if (r === y) {
        const from = Math.min(x, c);
        const to = Math.max(x, c);
        for (let i = from; i <= to; i++) {
          if (i === c) continue;
          if (!isPassable(r, i)) return false;
        }
      } else if (c === x) {
        const from = Math.min(y, r);
        const to = Math.max(y, r);
        for (let i = from; i <= to; i++) {
          if (i === r) continue;
          if (!isPassable(i, c)) return false;
        }
      } else {
        return false;
      }
      if (isPassable(r, c)) return true;
      // An uncaptured monster blocks movement like a wall, but - like any other
      // cell - is a valid tap target from anywhere in the same row/column as
      // long as everything up to it is clear, not just from an adjacent cell.
      return monsterIds[r][c] !== null;
    },
    [x, y, isPassable, monsterIds]
  );
  const goto = useCallback(
    (r: number, c: number): void => {
      if (flowMode !== "map") return;
      if (!isReachableAt(r, c)) return;
      const monsterId = monsterIds[r][c];
      if (monsterId !== null && captured[monsterId] === undefined) {
        // Blocks like a wall: walk up to the adjacent cell first, same as
        // approaching any other obstacle. Only once already there does
        // tapping the monster start the encounter.
        const isRow = r === y;
        const stepR = isRow ? y : r > y ? r - 1 : r + 1;
        const stepC = isRow ? (c > x ? c - 1 : c + 1) : x;
        if (stepR === y && stepC === x) {
          startEncounter(monsterId);
        } else {
          revealCells(computeTraversedCells(x, y, stepC, stepR));
          setPosition(stepC, stepR);
          setTrail((current) =>
            extendTrail(current, stepC, stepR, PATH_HISTORY_CELLS)
          );
        }
        return;
      }
      revealCells(computeTraversedCells(x, y, c, r));
      setPosition(c, r);
      setTrail((current) => extendTrail(current, c, r, PATH_HISTORY_CELLS));
    },
    [
      flowMode,
      isReachableAt,
      monsterIds,
      captured,
      startEncounter,
      setPosition,
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
  // than grouping several into shared per-cell slots.
  const followerPoints = useMemo(
    () => resamplePath(trail, CELL_SIZE, FOLLOWER_SPACING, orderedFollowerIds.length),
    [trail, orderedFollowerIds.length]
  );
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
            const cellClass = cell === CELL_TYPE.WALL ? "wall" : "road";
            const isTalking =
              isMonsterCell &&
              monster!.id === activeMonsterId &&
              talkingSpeaker === "monster";
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
                  {isMonsterCell && (
                    <>
                      <div className={styles.footShadow} />
                      <img
                        src={monster!.icon}
                        alt={monster!.name}
                        className={cn(
                          styles.monsterIcon,
                          isTalking && styles.talking
                        )}
                      />
                    </>
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
              : [x * CELL_SIZE + CELL_SIZE / 2, y * CELL_SIZE + CELL_SIZE / 2];
          return (
            <img
              key={id}
              src={MONSTERS[id].icon}
              alt={MONSTERS[id].name}
              className={styles.followerIcon}
              style={
                {
                  left: px,
                  top: py,
                  zIndex: orderedFollowerIds.length - i,
                  "--facing-scale": facing === "left" ? -1 : 1,
                } as React.CSSProperties
              }
            />
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
  const facing = useGameStore((state) => state.facing);
  const talkingSpeaker = useFlowStore((state) => state.talkingSpeaker);
  return (
    <div className={styles.container}>
      <Maze center={[centerX, centerY]} />
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
    </div>
  );
};

export default MazeContainer;
