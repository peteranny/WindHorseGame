import React, { useCallback, useMemo } from "react";
import cn from "classnames";
import styles from "./styles.css";
import { CELL_SIZE } from "./cellSize";
import simpleMap from "./map.txt";
import { useGameStore } from "../../store/gameStore";
import { useFlowStore } from "../../store/flowStore";
import { useLingeringMode } from "../../hooks/useLingeringMode";
import MONSTERS from "../../data/monsters/monsters";
import { CELL_TYPE, compileMap } from "./compileMap";
import { computeMonsterIds } from "./monsterPositions";
import {
  cellBeforeTarget,
  computeTraversedCells,
  findStoppingPoint,
} from "./exploration";
import { findGoalCell } from "./goalPosition";
import { computeHouseState, isAboveGoalCell } from "./houseState";
import { isPassableCell } from "./passability";
import { useFollowerTrail } from "./useFollowerTrail";
import MazeCell from "./MazeCell";
import FollowerTrailView from "./FollowerTrailView";
import PlayerPin from "./PlayerPin";
import ROAD_TILE from "../../assets/roadTile.jpg";
import WALL_TILE from "../../assets/wallTile.png";

interface MazeProps {
  center: [number, number];
}

const Maze = ({ center: [centerX, centerY] }: MazeProps) => {
  const map = useMemo(() => compileMap(simpleMap), []);
  const monsterIds = useMemo(() => computeMonsterIds(map), [map]);
  const goalCell = useMemo(() => findGoalCell(map), [map]);
  const [x, y] = useGameStore((state) => state.position);
  const previousPosition = useGameStore((state) => state.previousPosition);
  const facing = useGameStore((state) => state.facing);
  const setPosition = useGameStore((state) => state.setPosition);
  const setFacing = useGameStore((state) => state.setFacing);
  const revealCells = useGameStore((state) => state.revealCells);
  const captured = useGameStore((state) => state.captured);
  const goalDefeatedAt = useGameStore((state) => state.goalDefeatedAt);
  const houseState = useMemo(
    () => computeHouseState(goalDefeatedAt, [x, y], goalCell),
    [goalDefeatedAt, x, y, goalCell]
  );
  const flowMode = useFlowStore((state) => state.mode);
  // Lingers on "conversation" through the entering-battle transition's own
  // freeze/flash/cover-in delay (see useLingeringMode) - used only for
  // isBeingTalkedTo below, so the talked-to monster's facing/bounce doesn't
  // snap back to default the instant enterBattle() flips flowMode, well
  // before the screen is actually covered. goto's own "if (flowMode !==
  // 'map') return" gating still needs the real, current mode.
  const talkingMode = useLingeringMode();
  const activeMonsterId = useFlowStore((state) => state.activeMonsterId);
  const isGoalEncounter = useFlowStore((state) => state.isGoalEncounter);
  const talkingSpeaker = useFlowStore((state) => state.talkingSpeaker);
  const startEncounter = useFlowStore((state) => state.startEncounter);
  const startGoalEncounter = useFlowStore((state) => state.startGoalEncounter);
  const replayGoalFinale = useFlowStore((state) => state.replayGoalFinale);

  const isPassable = useCallback(
    (r: number, c: number): boolean =>
      isPassableCell(map, monsterIds, captured, r, c),
    [map, monsterIds, captured]
  );

  // Same order the battle attack line uses (and can reorder) - see
  // store/types.ts's own comment on monsterOrder.
  const orderedFollowerIds = useGameStore((state) => state.monsterOrder);
  const { followerPoints, noPathFollowerPoint, extendFollowerTrail } =
    useFollowerTrail({
      x,
      y,
      previousPosition,
      houseState,
      goalCell,
      facing,
      isPassable,
      map,
      followerCount: orderedFollowerIds.length,
    });

  const goto = useCallback(
    (r: number, c: number): void => {
      if (flowMode !== "map") return;
      if (r !== y && c !== x) return; // not on a shared row/column
      if (r === y && c === x) {
        // Tapped the player's own cell - normally a no-op, except while
        // occupying the cleared goal's house (see houseState.ts), where the
        // combined house+player sprite is standing right here. That's the
        // one case worth reacting to: replay the finale conversation.
        if (houseState === "occupied") {
          replayGoalFinale();
        }
        return;
      }

      // Walks as far toward (c, r) as the path actually allows - all the
      // way there if it's clear, otherwise stopping just short of whatever
      // blocks it first (a wall, an uncaptured monster, the goal, ...)
      // rather than refusing to move at all.
      const [stopC, stopR] = findStoppingPoint(isPassable, x, y, c, r);

      if (stopC === x && stopR === y) {
        // Couldn't move even one cell - only meaningful if the tapped cell
        // is itself the (now-adjacent) obstacle; otherwise there's nothing
        // to do (e.g. tapping past a wall/monster that's right next door).
        const [beforeC, beforeR] = cellBeforeTarget(x, y, c, r);
        if (beforeC !== x || beforeR !== y) return;
        const monsterId = monsterIds[r][c];
        const isGoalTile =
          goalCell !== null && c === goalCell[0] && r === goalCell[1];
        if (monsterId !== null && captured[monsterId] === undefined) {
          // Already adjacent - no move happens, so face what's being
          // challenged explicitly rather than leaving the sprite's last
          // travel direction (which may point some other way entirely).
          setFacing(c > x ? "right" : c < x ? "left" : r > y ? "down" : "up");
          startEncounter(monsterId);
        } else if (isGoalTile && r === y && c > x) {
          // Unlike a monster, the goal's own art is fixed facing left, so
          // it can only ever "look at" a player standing to its left -
          // approaching from the right, above, or below still blocks
          // movement like a wall, but doesn't start its conversation.
          setFacing("right");
          startGoalEncounter();
        }
        return;
      }

      revealCells(computeTraversedCells(x, y, stopC, stopR));
      setPosition(stopC, stopR);
      extendFollowerTrail(stopC, stopR);
    },
    [
      flowMode,
      isPassable,
      monsterIds,
      goalCell,
      captured,
      houseState,
      startEncounter,
      startGoalEncounter,
      replayGoalFinale,
      setPosition,
      setFacing,
      revealCells,
      extendFollowerTrail,
      x,
      y,
    ]
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
      style={
        {
          left: offsetX,
          top: offsetY,
          "--road-tile": `url(${ROAD_TILE})`,
          "--wall-tile": `url(${WALL_TILE})`,
        } as React.CSSProperties
      }
    >
      {map.map((cells, r) => (
        <div key={r} className={styles.row}>
          {cells.map((cell, c) => {
            const monsterId = monsterIds[r][c];
            const monster = monsterId !== null ? MONSTERS[monsterId] : null;
            const isCaptured =
              monster !== null && captured[monster.id] !== undefined;
            const isMonsterCell = monster !== null && !isCaptured;
            const isGoalCell =
              goalCell !== null && c === goalCell[0] && r === goalCell[1];
            const cellClass = cell === CELL_TYPE.WALL ? "wall" : "road";
            const isBeingTalkedTo =
              talkingMode === "conversation" &&
              ((isMonsterCell && monster!.id === activeMonsterId) ||
                (isGoalCell && isGoalEncounter));
            const isTalking = isBeingTalkedTo && talkingSpeaker === "monster";
            return (
              <MazeCell
                key={c}
                cellClass={cellClass}
                isMonsterCell={isMonsterCell}
                isGoalCell={isGoalCell}
                monster={monster}
                houseState={houseState}
                goalDefeatedAt={goalDefeatedAt}
                isBeingTalkedTo={isBeingTalkedTo}
                isTalking={isTalking}
                playerX={x}
                cellX={c}
                onClick={() => goto(r, c)}
              />
            );
          })}
        </div>
      ))}
      <FollowerTrailView
        orderedFollowerIds={orderedFollowerIds}
        followerPoints={followerPoints}
        noPathFollowerPoint={noPathFollowerPoint}
        facing={facing}
      />
    </div>
  );
};

interface ContainerProps {
  center: [number, number];
}

const MazeContainer = ({ center: [centerX, centerY] }: ContainerProps) => {
  const map = useMemo(() => compileMap(simpleMap), []);
  const goalCell = useMemo(() => findGoalCell(map), [map]);
  const facing = useGameStore((state) => state.facing);
  const position = useGameStore((state) => state.position);
  const goalDefeatedAt = useGameStore((state) => state.goalDefeatedAt);
  // Once the player's own cell coincides with the goal's, Maze itself draws
  // the combined "occupied house" sprite in that cell - this standalone pin
  // (always centered on the player's current cell) would otherwise draw the
  // player's sprite a second time right on top of it.
  const isInsideHouse =
    computeHouseState(goalDefeatedAt, position, goalCell) === "occupied";
  // The house's roof overhangs upward past its own cell (see .homeSprite in
  // styles.css), so standing in the row above the goal should draw the roof
  // in front of the player instead of the usual player-always-on-top order.
  const isBehindHouse = isAboveGoalCell(position, goalCell);
  return (
    <div className={styles.container}>
      <Maze center={[centerX, centerY]} />
      {!isInsideHouse && (
        <PlayerPin
          centerX={centerX}
          centerY={centerY}
          facing={facing}
          isBehindHouse={isBehindHouse}
        />
      )}
    </div>
  );
};

export default MazeContainer;
