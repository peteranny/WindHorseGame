import React, { useMemo } from "react";
import cn from "classnames";
import styles from "./styles.css";
import simpleMap from "../Maze/map.txt";
import { CELL_TYPE, compileMap } from "../Maze/compileMap";
import { computeMonsterIds } from "../Maze/monsterPositions";
import { findGoalCell } from "../Maze/goalPosition";
import { cellKey } from "../Maze/exploration";
import { useGameStore } from "../../store/gameStore";

const MiniMap = () => {
  const map = useMemo(() => compileMap(simpleMap), []);
  const monsterIds = useMemo(() => computeMonsterIds(map), [map]);
  const goalCell = useMemo(() => findGoalCell(map), [map]);
  const [x, y] = useGameStore((state) => state.position);
  const captured = useGameStore((state) => state.captured);
  const exploredCells = useGameStore((state) => state.exploredCells);

  return (
    <div className={styles.miniMap}>
      {map.map((cells, r) => (
        <div key={r} className={styles.row}>
          {cells.map((cell, c) => {
            const isPlayer = r === y && c === x;
            const monsterId = monsterIds[r][c];
            const isUncapturedMonster =
              monsterId !== null && captured[monsterId] === undefined;
            const isGoal =
              goalCell !== null && c === goalCell[0] && r === goalCell[1];
            const isExplored = isPlayer || !!exploredCells[cellKey(c, r)];
            // The cell's own terrain (wall/road) always renders as the
            // backdrop, explored or not, so a translucent fog overlay can sit
            // on top and let it show through faintly instead of hiding it
            // outright.
            const baseClass = cell === CELL_TYPE.WALL ? "wall" : "road";
            const markerClass = isPlayer
              ? "player"
              : isUncapturedMonster
              ? "monster"
              : isGoal
              ? "goal"
              : null;
            return (
              <div
                key={c}
                className={cn(
                  styles.cell,
                  styles[baseClass],
                  !isExplored && styles.fog,
                  markerClass && styles[markerClass]
                )}
              />
            );
          })}
        </div>
      ))}
    </div>
  );
};

export default MiniMap;
