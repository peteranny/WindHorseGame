import React from "react";
import cn from "classnames";
import styles from "./heart.css";
import { Phase } from "../types";

interface HeartOverlayProps {
  phase: Phase;
}

// A single heart, not a grid - see heart.css's own comment for why this
// (a plain transform: scale() on one already-oversized element) replaced
// the earlier attempts, both of which grew a *background-size*/*mask-size*
// on the shared .overlay element instead and kept falling short in one way
// or another. Cover: the heart scales from nothing up to comfortably larger
// than any real viewport, in lockstep with the whole "cover" phase
// (heart.css's animation-duration must match timing.ts's DISTORT_IN_MS) -
// BattleTransition/styles.css's battle-cover-heart-backdrop still snaps
// solid in the last sliver of the duration as a pure safety net. Reveal:
// the same heart shrinks back down to nothing and fades away (duration
// matching DISTORT_OUT_MS), revealing the battle screen underneath.
const HeartOverlay = ({ phase }: HeartOverlayProps) => {
  if (phase !== "cover" && phase !== "reveal") {
    return null;
  }

  return (
    <span
      className={cn(
        styles.heartShape,
        phase === "cover" && styles.heartGrowIn,
        phase === "reveal" && styles.heartShrinkOut
      )}
    />
  );
};

export default HeartOverlay;
