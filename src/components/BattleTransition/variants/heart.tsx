import React from "react";
import cn from "classnames";
import styles from "./heart.css";
import { Phase } from "../types";

// A 5x4 grid (not randomized) spread across the screen - each heart is
// sized generously enough (see heart.css) that neighboring hearts overlap,
// so the grid tiles solid black with no seams once every heart has popped
// in, rather than needing one single heart to grow big enough to cover the
// whole screen by itself (which is what this variant used to do, and which
// kept falling short on non-square viewports - see heart.css's own
// history/comment for why that approach was dropped).
const HEART_POP_POSITIONS: Array<{ top: string; left: string }> = [
  { top: "15%", left: "10%" },
  { top: "15%", left: "30%" },
  { top: "15%", left: "50%" },
  { top: "15%", left: "70%" },
  { top: "15%", left: "90%" },
  { top: "38%", left: "10%" },
  { top: "38%", left: "30%" },
  { top: "38%", left: "50%" },
  { top: "38%", left: "70%" },
  { top: "38%", left: "90%" },
  { top: "62%", left: "10%" },
  { top: "62%", left: "30%" },
  { top: "62%", left: "50%" },
  { top: "62%", left: "70%" },
  { top: "62%", left: "90%" },
  { top: "85%", left: "10%" },
  { top: "85%", left: "30%" },
  { top: "85%", left: "50%" },
  { top: "85%", left: "70%" },
  { top: "85%", left: "90%" },
];

interface HeartOverlayProps {
  phase: Phase;
}

// Cover: every heart in the grid pops in (grow + fade in, staggered) until
// they overlap solid across the whole screen - see
// BattleTransition/styles.css's battle-cover-heart-backdrop for the
// near-instant safety-net snap that catches whatever's left right at the
// very end, same as "firework". Reveal: the same grid zooms back out
// (shrink + fade out) to reveal the battle screen underneath - no separate
// backdrop needed here, since fading everything to invisible needs no
// correctness guarantee the way covering the screen does.
const HeartOverlay = ({ phase }: HeartOverlayProps) => {
  if (phase !== "cover" && phase !== "reveal") {
    return null;
  }

  return (
    <div className={styles.heartField}>
      {HEART_POP_POSITIONS.map((pos, index) => (
        <span
          key={index}
          className={cn(
            styles.heartShape,
            phase === "cover" && styles.heartPopIn,
            phase === "reveal" && styles.heartPopOut
          )}
          style={
            {
              top: pos.top,
              left: pos.left,
              "--heart-delay": `${index * 15}ms`,
            } as React.CSSProperties
          }
        />
      ))}
    </div>
  );
};

export default HeartOverlay;
