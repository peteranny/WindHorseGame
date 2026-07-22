import React, { useMemo } from "react";
import cn from "classnames";
import styles from "./styles.css";
import simpleMap from "../Maze/map.txt";
import { CELL_TYPE, compileMap } from "../Maze/compileMap";
import { computeMonsterIds } from "../Maze/monsterPositions";
import { findGoalCell } from "../Maze/goalPosition";
import { cellKey } from "../Maze/exploration";
import { isPassableCell } from "../Maze/passability";
import { useGameStore } from "../../store/gameStore";
import { useFlowStore } from "../../store/flowStore";

const MiniMap = () => {
  const map = useMemo(() => compileMap(simpleMap), []);
  const monsterIds = useMemo(() => computeMonsterIds(map), [map]);
  const goalCell = useMemo(() => findGoalCell(map), [map]);
  const [x, y] = useGameStore((state) => state.position);
  const captured = useGameStore((state) => state.captured);
  const exploredCells = useGameStore((state) => state.exploredCells);
  const teleportTo = useGameStore((state) => state.teleportTo);
  const flowMode = useFlowStore((state) => state.mode);

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
            // Unexplored cells all render as the same fog, regardless of the
            // real terrain underneath - a wall and a road must look
            // identical while unrevealed, or the fog would leak the maze's
            // layout before the player has actually explored it.
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
            // Only an already-explored, currently-walkable cell can be
            // teleported to - the same "passable" rule ordinary movement
            // already uses (plain road, or a captured monster's cell), never
            // a wall, an uncaptured monster, the goal tile, or unrevealed fog.
            const isTeleportable =
              !isPlayer &&
              flowMode === "map" &&
              isExplored &&
              isPassableCell(map, monsterIds, captured, r, c);
            return (
              <div
                key={c}
                className={cn(
                  styles.cell,
                  styles[baseClass],
                  markerClass && styles[markerClass],
                  isTeleportable && styles.teleportable
                )}
                onClick={isTeleportable ? () => teleportTo(c, r) : undefined}
              />
            );
          })}
        </div>
      ))}
    </div>
  );
};

export default MiniMap;
