import React from "react";
import cn from "classnames";
import styles from "./particles.css";
import { Phase } from "../types";

// A grid of real DOM circles, not an animated background-image gradient -
// particles used to grow/shrink a single @property-registered --dot-radius
// fed into a radial-gradient() with filter: contrast(100) thresholding the
// edges hard (see BattleTransition/styles.css's own git history for that
// version). Mobile Safari doesn't reliably repaint that filter's output
// when only the underlying gradient's custom property is what's changing -
// it reads as a flash straight to solid black and back, rather than a
// smooth grow/shrink (radial/stripes/rings, which animate a custom property
// too but never layer a filter on top, don't have this problem on the same
// phone). Real elements animated via transform: scale() sidestep it
// entirely - the same technique "heart" (a single scaled shape) and
// "clockwise" (several independently transformed shards) already use, both
// unaffected by the same bug.
//
// GRID_COLS x GRID_ROWS dots tile dotField, a fixed oversized square (see
// particles.css) - every cell is guaranteed square regardless of the real
// screen's own aspect ratio, and each dot oversizes past its own cell's
// corners so the grid's union is solid the instant every dot reaches
// scale(1), no gaps to repaint around.
const GRID_COLS = 6;
const GRID_ROWS = 6;
const DOT_COUNT = GRID_COLS * GRID_ROWS;

// Kept comfortably under BattleTransition/timing.ts's DISTORT_IN_MS/
// DISTORT_OUT_MS (900ms each), same budget constraint as clockwise's own
// tear-shard stagger (clockwise.tsx) - every dot finishes growing/shrinking
// well before the phase animating it ends.
const DOT_DELAY_STEP_MS = 10;

interface ParticlesOverlayProps {
  phase: Phase;
}

const ParticlesOverlay = ({ phase }: ParticlesOverlayProps) => {
  if (phase !== "cover" && phase !== "reveal") {
    return null;
  }
  const isRevealing = phase === "reveal";

  return (
    <div className={styles.dotField}>
      {Array.from({ length: DOT_COUNT }).map((_, index) => (
        <div key={index} className={styles.dotCell}>
          <span
            className={cn(
              styles.dot,
              isRevealing ? styles.dotShrink : styles.dotGrow
            )}
            style={
              {
                "--dot-delay": `${index * DOT_DELAY_STEP_MS}ms`,
              } as React.CSSProperties
            }
          />
        </div>
      ))}
    </div>
  );
};

export default ParticlesOverlay;
