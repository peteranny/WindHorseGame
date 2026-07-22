import React from "react";
import cn from "classnames";
import styles from "./styles.css";
import { CELL_SIZE } from "./cellSize";
import { useFlowStore } from "../../store/flowStore";
import { Facing } from "../../store/types";
import PLAYER_SPRITE from "../../assets/playerSprite.png";
import PLAYER_SPRITE_FRONT from "../../assets/playerSpriteFront.png";
import PLAYER_SPRITE_BACK from "../../assets/playerSpriteBack.png";

interface PlayerPinProps {
  centerX: number;
  centerY: number;
  facing: Facing;
  isBehindHouse: boolean;
}

// The player's own map sprite pin, centered on their current cell - not
// rendered at all while standing inside the cleared goal's house, where
// Maze itself draws a single combined house+player sprite instead (see
// MazeContainer's isInsideHouse).
const PlayerPin = ({
  centerX,
  centerY,
  facing,
  isBehindHouse,
}: PlayerPinProps) => {
  const talkingSpeaker = useFlowStore((state) => state.talkingSpeaker);
  const isTalking = talkingSpeaker === "protagonist";

  return (
    <div
      className={cn(styles.pin, isBehindHouse && styles.pinBehindHouse)}
      style={{
        width: CELL_SIZE,
        height: CELL_SIZE,
        left: centerX - CELL_SIZE / 2,
        top: centerY - CELL_SIZE / 2,
      }}
    >
      <div className={styles.footShadow} />
      <img
        src={
          facing === "down"
            ? PLAYER_SPRITE_FRONT
            : facing === "up"
            ? PLAYER_SPRITE_BACK
            : PLAYER_SPRITE
        }
        alt="player"
        className={cn(styles.playerSprite, isTalking && styles.talking)}
        style={
          {
            // The sprite's native art faces right, so only "left" needs a
            // flip; the dedicated front/back art needs no mirroring.
            "--facing-scale": facing === "left" ? -1 : 1,
          } as React.CSSProperties
        }
      />
    </div>
  );
};

export default PlayerPin;
