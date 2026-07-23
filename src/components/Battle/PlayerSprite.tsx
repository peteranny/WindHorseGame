import React, { forwardRef } from "react";
import cn from "classnames";
import styles from "./styles.css";
import PLAYER_SPRITE from "../../assets/playerSprite.png";

interface PlayerSpriteProps {
  isEntering: boolean;
  isSinking: boolean;
  isHealing: boolean;
  enterDelayMs: number;
  enterDurationMs: number;
}

// 小風's own map sprite doubles as the battle sprite (see PLAYER_SPRITE's own
// import). The ref is forwarded rather than swallowed - useTrajectory/
// useAttackGrid both measure this element's live position via
// getBoundingClientRect, and spriteEffects.ts's playBump animates it
// directly through the Web Animations API rather than through React state.
export const PlayerSprite = forwardRef<HTMLImageElement, PlayerSpriteProps>(
  (
    { isEntering, isSinking, isHealing, enterDelayMs, enterDurationMs },
    ref
  ) => (
    <img
      ref={ref}
      src={PLAYER_SPRITE}
      alt="小風"
      className={cn(
        styles.playerSprite,
        isEntering && styles.playerEnter,
        isSinking ? styles.playerSink : isHealing && styles.playerHeal
      )}
      style={
        {
          "--enter-delay": `${enterDelayMs}ms`,
          "--enter-duration": `${enterDurationMs}ms`,
        } as React.CSSProperties
      }
    />
  )
);

PlayerSprite.displayName = "PlayerSprite";
