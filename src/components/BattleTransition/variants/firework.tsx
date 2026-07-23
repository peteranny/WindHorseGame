import React from "react";
import styles from "./firework.css";
import { Phase } from "../types";

// Fixed positions/angles (not randomized) so both halves always read as one
// deliberate pattern rather than a different scatter every roll. See
// firework.css's own top comment for why cover and reveal are two
// completely unrelated mechanics rather than one gradient played both ways.
//
// Rows alternate between two column sets - brick-wall style, rather than a
// rigid 3x3 grid - so each row's bursts sit centered over the *gaps*
// between the row above/below it: "A" rows (1st, 3rd) use 3 columns
// (15/50/85%), "B" rows (2nd, 4th) use the 2 midpoints between those
// (32.5/67.5%) instead of a 3rd column of their own, since shifting a full
// 3-column row by half spacing would push its outer columns off-screen.
const FIREWORK_BURST_POSITIONS: Array<{ top: string; left: string }> = [
  { top: "12%", left: "15%" },
  { top: "12%", left: "50%" },
  { top: "12%", left: "85%" },
  { top: "37%", left: "32.5%" },
  { top: "37%", left: "67.5%" },
  { top: "62%", left: "15%" },
  { top: "62%", left: "50%" },
  { top: "62%", left: "85%" },
  { top: "87%", left: "32.5%" },
  { top: "87%", left: "67.5%" },
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
              "--burst-delay": `${burstIndex * 15}ms`,
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
