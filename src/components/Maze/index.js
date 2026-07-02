import React, { useCallback, useEffect, useMemo, useState } from "react";
import PropTypes from "prop-types";
import cn from "classnames";
import styles from "./styles.css";
import SCALE from "../../scale";
import simpleMap from "./map.txt";

const CELL_TYPE = {
  ROAD: " ",
  WALL: "X",
};

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

const getLocalPosition = () => {
  try {
    const raw = localStorage.getItem("position");
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
};

const setLocalPosition = (x, y) => {
  localStorage.setItem(
    "position",
    JSON.stringify({ x, y, timestamp: Date.now() })
  );
};

const Maze = ({ center: [centerX, centerY] }) => {
  const classNameForCell = useCallback((cell) => {
    switch (cell) {
      case CELL_TYPE.ROAD:
        return "road";
      case CELL_TYPE.WALL:
        return "wall";
      default:
        return null;
    }
  }, []);
  const contentForCell = useCallback((cell) => "", []);
  const compileMap = useCallback(
    (mapString) =>
      mapString
        .replace(/^\n*/, "")
        .replace(/\n*$/, "")
        .split("\n")
        .map((rowString) => rowString.split("")),
    []
  );
  const map = useMemo(() => compileMap(simpleMap), [compileMap]);
  const [position, setPosition] = useState(null);
  const x = position ? position[0] : 0;
  const y = position ? position[1] : 0;
  useEffect(() => {
    const local = getLocalPosition();
    if (typeof google !== "undefined") {
      google.script.run
        .withSuccessHandler((remote) => {
          if (remote && (!local || remote.timestamp >= local.timestamp)) {
            setPosition([remote.x, remote.y]);
          } else {
            const pos = local || { x: 2, y: 1 };
            setPosition([pos.x, pos.y]);
          }
        })
        .getPosition(deviceId);
    } else {
      const pos = local || { x: 2, y: 1 };
      setPosition([pos.x, pos.y]);
    }
  }, []);
  const isReachableAt = useCallback(
    (r, c) => {
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
    (r, c) => {
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
          {cells.map((cell, c) => (
            <div
              key={c}
              className={styles.cell}
              style={{
                minWidth: CELL_SIZE,
                maxWidth: CELL_SIZE,
                height: CELL_SIZE,
              }}
              onClick={(e) => goto(r, c)}
            >
              <div
                className={cn(
                  styles.cellContent,
                  styles[classNameForCell(cell)]
                )}
              >
                {contentForCell(cell)}
              </div>
            </div>
          ))}
        </div>
      ))}
    </div>
  );
};

Maze.propTypes = {
  center: PropTypes.arrayOf(PropTypes.number).isRequired,
};

const MazeContainer = ({ center: [centerX, centerY] }) => {
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

MazeContainer.propTypes = {
  center: PropTypes.arrayOf(PropTypes.number).isRequired,
};

export default MazeContainer;
