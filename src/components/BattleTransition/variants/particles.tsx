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
// phone). Real elements sidestep that repaint bug entirely regardless of
// how they're animated - the same category of fix "heart" (a single scaled
// shape) and "clockwise" (several independently transformed shards) already
// use.
//
// Each dot's own grow/shrink is driven by animating width/height directly
// (see particles.css), not transform: scale() - scale() reuses one
// rasterized bitmap and lets the compositor stretch it, which blows the
// browser's normal ~1px anti-aliased edge up into a visibly soft/blurry
// band as the circle grows (filter: contrast(100) can't fix this - it
// doesn't touch the alpha channel where that softness actually lives, which
// is why the earlier version still looked feathered despite that filter).
// Animating width/height instead makes the browser re-rasterize a crisp
// circle fresh at its real size every frame. That also frees up each dot's
// own transform for nothing but centering (translate(-50%, -50%), so left/
// top can stay simple percentages regardless of the dot's current size) -
// the reveal's shared 45deg burst (below) then belongs on dotField itself,
// same as every other variant's own overlay.
//
// ROWS x COLS dots tile dotField, a square of the viewport's own longer
// edge (100vmax, see particles.css - same sizing rule radial/stripes/rings
// share) so every row/column pitch is guaranteed proportional regardless of
// the real screen's own aspect ratio, and every dot is still there to be
// rotated by dotFieldReveal's own burst without uncovering a corner. Odd
// rows are offset by half a column's width from even rows - a brick/
// quincunx layout, so once every dot reaches its full size each row's dots
// sit over the previous row's own gaps rather than stacking in a plain
// rectangular grid.
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

// Only staggers growing-in (cover has no field-level motion of its own to
// stay in sync with, so a little per-dot twinkle reads fine there) - kept
// comfortably under BattleTransition/timing.ts's DISTORT_IN_MS (900ms),
// same budget constraint as clockwise's own tear-shard stagger
// (clockwise.tsx), so every dot finishes growing well before "cover" ends,
// even at DOTS.length - 1 (38). Revealing skips the stagger entirely (see
// below) so every dot recedes in lockstep with dotFieldReveal's own burst.
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
    <div
      className={cn(styles.dotField, isRevealing && styles.dotFieldReveal)}
    >
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
              "--dot-delay": isRevealing
                ? "0ms"
                : `${index * DOT_DELAY_STEP_MS}ms`,
            } as React.CSSProperties
          }
        />
      ))}
    </div>
  );
};

export default ParticlesOverlay;
