import React, { useCallback } from "react";
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

const Maze = () => {
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
  const [x, y] = [0, 0];
  const centerRect = {
    left: x * CELL_SIZE,
    top: y * CELL_SIZE,
    width: CELL_SIZE,
    height: CELL_SIZE,
  };
  const [centerX, centerY] = [window.innerWidth / 2, window.innerHeight / 2];
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
  return (
    <div
      className={styles.map}
      style={{ position: "relative", left: offsetX, top: offsetY }}
    >
      {compileMap(simpleMap).map((cells, r) => (
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

export default Maze;
