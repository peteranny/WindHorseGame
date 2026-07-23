import React, { forwardRef } from "react";
import cn from "classnames";
import styles from "./styles.css";

interface EnemySpriteProps {
  src: string;
  alt: string;
  isEntering: boolean;
  isSinking: boolean;
  isHealing: boolean;
  enterDelayMs: number;
  enterDurationMs: number;
}

// The wild monster's (or the goal's) own icon, doubling as its battle
// sprite. The ref is forwarded rather than swallowed - useTrajectory/
// useAttackGrid/useWildAttackClock all measure this element's live
// position via getBoundingClientRect, and spriteEffects.ts's playBump
// animates it directly through the Web Animations API rather than through
// React state.
export const EnemySprite = forwardRef<HTMLImageElement, EnemySpriteProps>(
  (
    { src, alt, isEntering, isSinking, isHealing, enterDelayMs, enterDurationMs },
    ref
  ) => (
    <img
      ref={ref}
      src={src}
      alt={alt}
      className={cn(
        styles.enemySprite,
        isEntering && styles.enemyEnter,
        isSinking ? styles.enemySink : isHealing && styles.enemyHeal
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

EnemySprite.displayName = "EnemySprite";
