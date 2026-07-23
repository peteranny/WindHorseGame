import React, { forwardRef } from "react";
import cn from "classnames";
import styles from "./styles.css";

interface EnemyShadowProps {
  isEntering: boolean;
  isSinking: boolean;
  enterDelayMs: number;
  enterDurationMs: number;
}

// A ground shadow for the enemy, like the map's own .footShadow - bumped in
// lockstep with EnemySprite (see Battle/index.tsx's attack-bump call) so it
// stays under the sprite's feet during its horizontal lunge instead of
// sitting fixed while the sprite visibly shifts away from it. The ref is
// forwarded since that bump is triggered via a direct DOM reference, not
// React state.
export const EnemyShadow = forwardRef<HTMLDivElement, EnemyShadowProps>(
  ({ isEntering, isSinking, enterDelayMs, enterDurationMs }, ref) => (
    <div
      ref={ref}
      className={cn(
        styles.enemyShadow,
        isEntering && styles.enemyShadowEnter,
        isSinking && styles.enemyShadowSink
      )}
      aria-hidden="true"
      style={
        {
          "--enter-delay": `${enterDelayMs}ms`,
          "--enter-duration": `${enterDurationMs}ms`,
        } as React.CSSProperties
      }
    />
  )
);

EnemyShadow.displayName = "EnemyShadow";
