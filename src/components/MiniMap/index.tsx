import React, { useMemo } from "react";
import cn from "classnames";
import styles from "./styles.css";
import simpleMap from "../Maze/map.txt";
import { CELL_TYPE, compileMap } from "../Maze/compileMap";
import { computeMonsterIds } from "../Maze/monsterPositions";
import { cellKey } from "../Maze/exploration";
import { useGameStore } from "../../store/gameStore";

const MiniMap = () => {
  const map = useMemo(() => compileMap(simpleMap), []);
  const monsterIds = useMemo(() => computeMonsterIds(map), [map]);
  const [x, y] = useGameStore((state) => state.position);
  const captured = useGameStore((state) => state.captured);
  const exploredCells = useGameStore((state) => state.exploredCells);

  return (
    <div className={styles.miniMap}>
      {map.map((cells, r) => (
        <div key={r} className={styles.row}>
          {cells.map((cell, c) => {
            const isPlayer = r === y && c === x;
            if (!isPlayer && !exploredCells[cellKey(c, r)]) {
              return <div key={c} className={cn(styles.cell, styles.fog)} />;
            }
            const monsterId = monsterIds[r][c];
            const isUncapturedMonster =
              monsterId !== null && captured[monsterId] === undefined;
            const dotClass = isPlayer
              ? "player"
              : isUncapturedMonster
              ? "monster"
              : cell === CELL_TYPE.WALL
              ? "wall"
              : "road";
            return (
              <div key={c} className={cn(styles.cell, styles[dotClass])} />
            );
          })}
        </div>
      ))}
    </div>
  );
};

export default MiniMap;
