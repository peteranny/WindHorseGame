import React, { useCallback, useMemo } from "react";
import cn from "classnames";
import styles from "./styles.css";
import SCALE from "../../scale";
import simpleMap from "./map.txt";
import { useGameStore } from "../../store/gameStore";

const CELL_TYPE = {
  ROAD: " ",
  WALL: "X",
} as const;

const CELL_SIZE = 100 * SCALE;

interface MazeProps {
  center: [number, number];
}

const Maze = ({ center: [centerX, centerY] }: MazeProps) => {
  const classNameForCell = useCallback((cell: string): string | null => {
    switch (cell) {
      case CELL_TYPE.ROAD:
        return "road";
      case CELL_TYPE.WALL:
        return "wall";
      default:
        return null;
    }
  }, []);
  const contentForCell = useCallback((_cell: string): string => "", []);
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
  const [x, y] = useGameStore((state) => state.position);
  const setPosition = useGameStore((state) => state.setPosition);
  const isReachableAt = useCallback(
    (r: number, c: number): boolean => {
      if (r === y) {
        let isReachable = true;
        const from = x < c ? x : c;
        const to = c > x ? c : x;
        for (let i = from; i <= to; i++)
          if (map[r][i] !== " ") isReachable = false;
        return isReachable;
      }
      if (c === x) {
        let isReachable = true;
        const from = y < r ? y : r;
        const to = r > y ? r : y;
        for (let i = from; i <= to; i++)
          if (map[i][c] !== " ") isReachable = false;
        return isReachable;
      }
      return false;
    },
    [map, x, y]
  );
  const goto = useCallback(
    (r: number, c: number): void => {
      if (isReachableAt(r, c)) setPosition(c, r);
    },
    [isReachableAt, setPosition]
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
            const cellClass = classNameForCell(cell);
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
                <div
                  className={cn(
                    styles.cellContent,
                    cellClass !== null ? styles[cellClass] : undefined
                  )}
                >
                  {contentForCell(cell)}
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
        V
      </div>
    </div>
  );
};

export default MazeContainer;
