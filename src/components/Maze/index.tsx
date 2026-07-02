import React, { useCallback, useEffect, useMemo, useState } from "react";
import cn from "classnames";
import styles from "./styles.css";
import SCALE from "../../scale";
import simpleMap from "./map.txt";

const CELL_TYPE = {
  ROAD: " ",
  WALL: "X",
} as const;

const CELL_SIZE = 100 * SCALE;

const deviceId = (() => {
  let id = localStorage.getItem("deviceId");
  if (!id) {
    id =
      Math.random().toString(36).slice(2) + Math.random().toString(36).slice(2);
    localStorage.setItem("deviceId", id);
  }
  return id;
})();

interface StoredPosition {
  x: number;
  y: number;
  timestamp: number;
}

const getLocalPosition = (): StoredPosition | null => {
  try {
    const raw = localStorage.getItem("position");
    return raw ? (JSON.parse(raw) as StoredPosition) : null;
  } catch {
    return null;
  }
};

const setLocalPosition = (x: number, y: number): void => {
  localStorage.setItem(
    "position",
    JSON.stringify({ x, y, timestamp: Date.now() })
  );
};

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
  const [position, setPosition] = useState<[number, number] | null>(null);
  const x = position ? position[0] : 0;
  const y = position ? position[1] : 0;
  useEffect(() => {
    const local = getLocalPosition();
    if (typeof google !== "undefined") {
      google.script.run
        .withSuccessHandler<StoredPosition | null>((remote) => {
          if (remote && (!local || remote.timestamp >= local.timestamp)) {
            setPosition([remote.x, remote.y]);
          } else {
            const pos = local ?? { x: 2, y: 1 };
            setPosition([pos.x, pos.y]);
          }
        })
        .getPosition(deviceId);
    } else {
      const pos = local ?? { x: 2, y: 1 };
      setPosition([pos.x, pos.y]);
    }
  }, []);
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
      if (isReachableAt(r, c)) setPosition([c, r]);
    },
    [isReachableAt]
  );
  useEffect(() => {
    if (position) {
      setLocalPosition(x, y);
      if (typeof google !== "undefined") {
        google.script.run.savePosition(deviceId, x, y, Date.now());
      }
    }
  }, [x, y, position]);
  if (!position) return null;
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
