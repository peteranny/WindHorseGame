import React from "react";
import styles from "./firework.css";
import { Phase } from "../types";

// Fixed positions/angles (not randomized) so both halves always read as one
// deliberate pattern rather than a different scatter every roll. See
// firework.css's own top comment for why cover and reveal are two
// completely unrelated mechanics rather than one gradient played both ways.
//
// Just 3 bursts, spread unevenly (not a symmetric triangle) so they read as
// a deliberate scatter rather than a rigid formation - each ray now reaches
// a viewport-relative 100vmax (see firework.css), so a single burst alone
// already covers the full screen; 3 staggered ones is plenty to read as a
// graceful volley without the clutter of many simultaneous bursts.
const FIREWORK_BURST_POSITIONS: Array<{ top: string; left: string }> = [
  { top: "20%", left: "25%" },
  { top: "35%", left: "70%" },
  { top: "75%", left: "40%" },
];
const FIREWORK_RAY_ANGLES = [
  0, 30, 60, 90, 120, 150, 180, 210, 240, 270, 300, 330,
];

interface FireworkOverlayProps {
  phase: Phase;
}

// Cover: real black rockets rise then burst into black spark rays - these
// are what actually blacken the screen (see BattleTransition/styles.css's
// battle-cover-firework-backdrop for the near-instant safety-net snap that
// catches whatever's left right at the very end). Reveal is a plain fade
// (styles.css's battle-reveal-firework-fade) - the pie-slice tear-apart
// effect this used to use moved to "clockwise" instead (variants/
// clockwise.tsx), which suits a clock-hand sweep's own exit better than a
// firework's.
const FireworkOverlay = ({ phase }: FireworkOverlayProps) => {
  if (phase !== "cover") {
    return null;
  }

  return (
    <div className={styles.fireworkField}>
      {FIREWORK_BURST_POSITIONS.map((pos, burstIndex) => (
        <div
          key={burstIndex}
          className={styles.fireworkBurst}
          style={
            {
              top: pos.top,
              left: pos.left,
              // Each burst's own rocket+blast cycle (firework.css) is ~250ms
              // - staggering by that same amount lets one burst finish
              // blasting before the next rocket launches, reading as a
              // sequential rocket-blast-rocket-blast-rocket-blast volley
              // rather than 3 near-simultaneous pops.
              "--burst-delay": `${burstIndex * 250}ms`,
            } as React.CSSProperties
          }
        >
          <span className={styles.fireworkRocket} />
          {FIREWORK_RAY_ANGLES.map((angle) => (
            <span
              key={angle}
              className={styles.fireworkRay}
              style={{ "--ray-angle": `${angle}deg` } as React.CSSProperties}
            />
          ))}
        </div>
      ))}
    </div>
  );
};

export default FireworkOverlay;
