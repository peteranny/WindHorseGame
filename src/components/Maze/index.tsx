import React, {
  useCallback,
  useEffect,
  useMemo,
  useReducer,
  useRef,
  useState,
} from "react";
import cn from "classnames";
import styles from "./styles.css";
import SCALE from "../../scale";
import simpleMap from "./map.txt";
import { useGameStore } from "../../store/gameStore";
import { useFlowStore } from "../../store/flowStore";
import MONSTERS from "../../data/monsters/monsters";
import { isUnlockConditionMet } from "../../data/monsters/unlockCondition";
import { computeMonsterIds } from "./monsterPositions";
import { PLAYER_SPRITE } from "../../assets/playerSprite.generated";

const CELL_TYPE = {
  ROAD: " ",
  WALL: "X",
} as const;

const CELL_SIZE = 100 * SCALE;
const UNLOCK_CHECK_INTERVAL_MS = 60000;

interface MazeProps {
  center: [number, number];
}

const Maze = ({ center: [centerX, centerY] }: MazeProps) => {
  const compileMap = useCallback(
    (mapString: string): string[][] =>
      mapString
        .replace(/^\n*/, "")
        .replace(/\n*$/, "")
        .split("\n")
        .map((rowString) => rowString.split("")),
    []
  );
  const map = useMemo(() => compileMap(simpleMap), [compileMap]);
  const monsterIds = useMemo(() => computeMonsterIds(map), [map]);
  const [x, y] = useGameStore((state) => state.position);
  const setPosition = useGameStore((state) => state.setPosition);
  const captured = useGameStore((state) => state.captured);
  const flowMode = useFlowStore((state) => state.mode);
  const startEncounter = useFlowStore((state) => state.startEncounter);

  // Unlock conditions are time-based, so re-render periodically to keep
  // locked/challengeable markers current without requiring a reload.
  const [, forceTick] = useReducer((n: number) => n + 1, 0);
  useEffect(() => {
    const id = setInterval(forceTick, UNLOCK_CHECK_INTERVAL_MS);
    return () => clearInterval(id);
  }, []);

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
      const distance = Math.abs(r - y) + Math.abs(c - x);
      return distance === 1 && monsterIds[r][c] !== null;
    },
    [x, y, isPassable, monsterIds]
  );
  const goto = useCallback(
    (r: number, c: number): void => {
      if (flowMode !== "map") return;
      if (!isReachableAt(r, c)) return;
      const monsterId = monsterIds[r][c];
      if (monsterId !== null && captured[monsterId] === undefined) {
        startEncounter(monsterId);
        return;
      }
      setPosition(c, r);
    },
    [flowMode, isReachableAt, monsterIds, captured, startEncounter, setPosition]
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
            const cellClass = isMonsterCell
              ? "monster"
              : cell === CELL_TYPE.WALL
              ? "wall"
              : "road";
            const isLocked =
              isMonsterCell &&
              !isUnlockConditionMet(monster!.unlockCondition, new Date());
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
                        isLocked && styles.monsterLocked
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
  const x = useGameStore((state) => state.position[0]);
  const [facing, setFacing] = useState<"left" | "right">("left");
  const prevXRef = useRef(x);
  useEffect(() => {
    if (x > prevXRef.current) setFacing("right");
    else if (x < prevXRef.current) setFacing("left");
    prevXRef.current = x;
  }, [x]);
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
          className={styles.playerSprite}
          style={{ transform: facing === "right" ? "scaleX(-1)" : undefined }}
        />
      </div>
    </div>
  );
};

export default MazeContainer;
