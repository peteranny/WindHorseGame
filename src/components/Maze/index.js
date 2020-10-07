import React, { useCallback } from "react";
import cn from "classnames";
import styles from "./styles.css";

const CELL_TYPE = {
  ROAD: " ",
  WALL: "X",
};

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
  return (
    <div className={styles.map}>
      {compileMap(simpleMap).map((cells, i) => (
        <div key={i} className={styles.row}>
          {cells.map((cell, j) => (
            <div key={j} className={styles.cell}>
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
