import React from "react";
import cn from "classnames";
import styles from "./styles.css";
import { Monster } from "../../data/monsters/types";
import { HouseState } from "./houseState";
import GoalCelebration from "./GoalCelebration";
import GOAL_SPRITE from "../../assets/goalSprite.png";
import HOME_SPRITE from "../../assets/home.png";
import HOME_EMPTY_SPRITE from "../../assets/home-empty.png";

interface MazeCellProps {
  cellClass: "wall" | "road";
  isMonsterCell: boolean;
  isGoalCell: boolean;
  monster: Monster | null;
  houseState: HouseState;
  goalDefeatedAt: string | null;
  isBeingTalkedTo: boolean;
  isTalking: boolean;
  playerX: number;
  cellX: number;
  onClick: () => void;
}

const MazeCell = ({
  cellClass,
  isMonsterCell,
  isGoalCell,
  monster,
  houseState,
  goalDefeatedAt,
  isBeingTalkedTo,
  isTalking,
  playerX,
  cellX,
  onClick,
}: MazeCellProps) => (
  <div className={styles.cell} onClick={onClick}>
    <div className={cn(styles.cellContent, styles[cellClass])}>
      {isGoalCell && houseState === "occupied" ? (
        <img src={HOME_SPRITE} alt="home" className={styles.homeSprite} />
      ) : (
        <>
          {isGoalCell && houseState === "empty" && (
            <img
              src={HOME_EMPTY_SPRITE}
              alt=""
              aria-hidden="true"
              className={styles.homeEmptySprite}
            />
          )}
          {(isMonsterCell || isGoalCell) && (
            <>
              <div
                className={cn(
                  styles.footShadow,
                  isGoalCell && styles.aboveHouse
                )}
              />
              <img
                src={isGoalCell ? GOAL_SPRITE : monster!.icon}
                alt={isGoalCell ? "goal" : monster!.name}
                className={cn(
                  styles.monsterIcon,
                  isTalking && styles.talking,
                  isGoalCell && styles.aboveHouse
                )}
                style={
                  {
                    // This art is native left-facing - flip only
                    // when the player is to its right, so it faces
                    // the player throughout the conversation.
                    "--facing-scale":
                      isBeingTalkedTo && playerX > cellX ? -1 : 1,
                  } as React.CSSProperties
                }
              />
            </>
          )}
        </>
      )}
      {isGoalCell && goalDefeatedAt !== null && <GoalCelebration />}
    </div>
  </div>
);

export default MazeCell;
