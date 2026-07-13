import React, { useCallback, useMemo } from "react";
import cn from "classnames";
import styles from "./styles.css";
import SCALE from "../../scale";
import simpleMap from "./map.txt";
import { useGameStore } from "../../store/gameStore";
import { useFlowStore } from "../../store/flowStore";
import MONSTERS from "../../data/monsters/monsters";
import { CELL_TYPE, compileMap } from "./compileMap";
import { computeMonsterIds } from "./monsterPositions";
import { PLAYER_SPRITE } from "../../assets/playerSprite.generated";

const CELL_SIZE = 100 * SCALE;

interface MazeProps {
  center: [number, number];
}

const Maze = ({ center: [centerX, centerY] }: MazeProps) => {
  const map = useMemo(() => compileMap(simpleMap), []);
  const monsterIds = useMemo(() => computeMonsterIds(map), [map]);
  const [x, y] = useGameStore((state) => state.position);
  const setPosition = useGameStore((state) => state.setPosition);
  const captured = useGameStore((state) => state.captured);
  const flowMode = useFlowStore((state) => state.mode);
  const activeMonsterId = useFlowStore((state) => state.activeMonsterId);
  const talkingSpeaker = useFlowStore((state) => state.talkingSpeaker);
  const startEncounter = useFlowStore((state) => state.startEncounter);

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
          setPosition(stepC, stepR);
        }
        return;
      }
      setPosition(c, r);
    },
    [
      flowMode,
      isReachableAt,
      monsterIds,
      captured,
      startEncounter,
      setPosition,
      x,
      y,
    ]
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
                    <img
                      src={monster!.icon}
                      alt={monster!.name}
                      className={cn(
                        styles.monsterIcon,
                        isTalking && styles.talking
                      )}
                    />
                  )}
                </div>
              </div>
            );
          })}
        </div>
      ))}
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
        <img
          src={PLAYER_SPRITE}
          alt="player"
          className={cn(
            styles.playerSprite,
            talkingSpeaker === "protagonist" && styles.talking
          )}
          style={
            {
              "--facing-scale": facing === "right" ? -1 : 1,
            } as React.CSSProperties
          }
        />
      </div>
    </div>
  );
};

export default MazeContainer;
