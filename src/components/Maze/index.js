import React, { useCallback, useMemo, useState } from "react";
import PropTypes from "prop-types";
import cn from "classnames";
import styles from "./styles.css";

const CELL_TYPE = {
  ROAD: " ",
  WALL: "X",
};

const CELL_SIZE = 100;

const simpleMap = `
XXXXXXXXXXXXXXXXXXXXXXXXXXXXX
XX           XXXXX          X
XX XXXXX XXX XXXXX XXXXXXXX X
XX XXX   XXX          X     X
XXXXXXXX XXX XXXXXXXX XX XXXX
XX             X         XXXX
XXXX XXXXXXXXXXXXXX XXXXXXXXX
XX   XXXX   XX   XX         X
XX XXXXXX X XXXX XXXXXXXXXX X
X         X       X         X
XX XX XXX XXXX XXXX XXXXX XXX
XX XX     XXXX      XX     XX
XXXXXXXXXXXXXXXXXXXXXXXXXXXXX
`;

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
  const [[x, y], setPosition] = useState([2, 1]);
  const centerRect = {
    left: x * CELL_SIZE,
    top: y * CELL_SIZE,
    width: CELL_SIZE,
    height: CELL_SIZE,
  };
  const centerTargetRect = {
    ...centerRect,
    left: centerX - centerRect.width / 2,
    top: centerY - centerRect.height / 2,
  };
  const offset = [
    centerTargetRect.left - centerRect.left,
    centerTargetRect.top - centerRect.top,
  ];
  const [offsetX, offsetY] = offset;
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
