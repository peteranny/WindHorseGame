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

// The 8 pie-slice wedges "firework"'s own reveal shatters the screen into -
// (50%, 50%) plus two adjacent perimeter points (the 4 corners and the 4
// edge-midpoints, in compass order) so their union exactly tiles the whole
// box with no gaps/overlap at rest, before each flies outward in its own
// direction on reveal.
const TEAR_WEDGES: Array<{
  clipPath: string;
  x: string;
  y: string;
  rotate: string;
}> = [
  { clipPath: "polygon(50% 50%, 0% 0%, 50% 0%)", x: "-55vw", y: "-55vh", rotate: "-30deg" },
  { clipPath: "polygon(50% 50%, 50% 0%, 100% 0%)", x: "55vw", y: "-55vh", rotate: "30deg" },
  { clipPath: "polygon(50% 50%, 100% 0%, 100% 50%)", x: "70vw", y: "-15vh", rotate: "40deg" },
  { clipPath: "polygon(50% 50%, 100% 50%, 100% 100%)", x: "70vw", y: "15vh", rotate: "-40deg" },
  { clipPath: "polygon(50% 50%, 100% 100%, 50% 100%)", x: "55vw", y: "55vh", rotate: "30deg" },
  { clipPath: "polygon(50% 50%, 50% 100%, 0% 100%)", x: "-55vw", y: "55vh", rotate: "-30deg" },
  { clipPath: "polygon(50% 50%, 0% 100%, 0% 50%)", x: "-70vw", y: "15vh", rotate: "-40deg" },
  { clipPath: "polygon(50% 50%, 0% 50%, 0% 0%)", x: "-70vw", y: "-15vh", rotate: "40deg" },
];

interface FireworkOverlayProps {
  phase: Phase;
}

// Cover: real black rockets rise then burst into black spark rays - these
// are what actually blacken the screen (see BattleTransition/styles.css's
// battle-cover-firework-backdrop for the near-instant safety-net snap that
// catches whatever's left right at the very end). Reveal: 8 pie-slice
// shards that already tile solid black at rest fly apart, tearing the
// screen open.
const FireworkOverlay = ({ phase }: FireworkOverlayProps) => {
  if (phase === "cover") {
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
  }

  if (phase === "reveal") {
    return (
      <div className={styles.tearField}>
        {TEAR_WEDGES.map((wedge, index) => (
          <div
            key={index}
            className={styles.tearShard}
            style={
              {
                clipPath: wedge.clipPath,
                "--tear-x": wedge.x,
                "--tear-y": wedge.y,
                "--tear-rotate": wedge.rotate,
                "--tear-delay": `${index * 35}ms`,
              } as React.CSSProperties
            }
          />
        ))}
      </div>
    );
  }

  return null;
};

export default FireworkOverlay;
