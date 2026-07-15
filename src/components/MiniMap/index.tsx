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
            // Every cell always renders its own backdrop first - the dark
            // mist if unexplored, or its real terrain once revealed - so a
            // monster/goal marker punching through the fog still sits on a
            // mist-colored square instead of leaving a lighter patch behind
            // it (border-radius clips the marker to a circle, exposing the
            // square's corners). The marker is then layered on top as a
            // second class, never by replacing this backdrop.
            const baseClass = !isExplored
              ? "fog"
              : cell === CELL_TYPE.WALL
              ? "wall"
              : "road";
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
