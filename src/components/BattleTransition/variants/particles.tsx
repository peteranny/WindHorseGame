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
// unaffected by the same bug. particles.css still applies its own
// filter: contrast(100) to each dot to kill the same soft anti-aliased edge
// the old version fought - safe here since what's actually animating is
// transform (a universally well-supported compositor animation), not a
// gradient driven by a custom property, so the earlier repaint bug doesn't
// apply to this combination.
//
// ROWS x COLS dots tile dotField, a fixed oversized square (see
// particles.css) so every row/column pitch is guaranteed proportional
// regardless of the real screen's own aspect ratio. Odd rows are offset by
// half a column's width from even rows - a brick/quincunx layout, so once
// every dot reaches scale(1) each row's dots sit over the previous row's
// own gaps rather than stacking in a plain rectangular grid.
const ROWS = 6;
const COLS = 6;

interface Dot {
  xPercent: number;
  yPercent: number;
}

const DOTS: Dot[] = (() => {
  const dots: Dot[] = [];
  for (let row = 0; row < ROWS; row += 1) {
    const yPercent = ((row + 0.5) / ROWS) * 100;
    const isOffsetRow = row % 2 === 1;
    if (isOffsetRow) {
      // COLS + 1 dots, centered on each column *line* (0, 1/COLS, ...,
      // 1 of the way across) rather than each column's own center - i.e.
      // shifted half a column from the row above/below, landing exactly
      // in its gaps.
      for (let col = 0; col <= COLS; col += 1) {
        dots.push({ xPercent: (col / COLS) * 100, yPercent });
      }
    } else {
      for (let col = 0; col < COLS; col += 1) {
        dots.push({ xPercent: ((col + 0.5) / COLS) * 100, yPercent });
      }
    }
  }
  return dots;
})();

// Kept comfortably under BattleTransition/timing.ts's DISTORT_IN_MS/
// DISTORT_OUT_MS (900ms each), same budget constraint as clockwise's own
// tear-shard stagger (clockwise.tsx) - every dot finishes growing/shrinking
// well before the phase animating it ends, even at DOTS.length - 1 (38).
const DOT_DELAY_STEP_MS = 8;

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
      {DOTS.map((dot, index) => (
        <span
          key={index}
          className={cn(
            styles.dot,
            isRevealing ? styles.dotShrink : styles.dotGrow
          )}
          style={
            {
              left: `${dot.xPercent}%`,
              top: `${dot.yPercent}%`,
              "--dot-delay": `${index * DOT_DELAY_STEP_MS}ms`,
            } as React.CSSProperties
          }
        />
      ))}
    </div>
  );
};

export default ParticlesOverlay;
