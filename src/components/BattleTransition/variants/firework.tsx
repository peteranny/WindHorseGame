import React from "react";
import styles from "./firework.css";
import { Phase } from "../types";

// A single centered burst - each ray reaches a viewport-relative 100vmax
// (see firework.css), so one burst alone already covers the full screen;
// multiple simultaneous or sequential bursts either cluttered the screen
// or forced a rushed rocket/blast pace to fit them all in before the
// cover phase ends, neither of which read as gracefully as one unhurried
// burst.
const FIREWORK_BURST_POSITION = { top: "50%", left: "50%" };
const FIREWORK_RAY_ANGLES = [
  0, 30, 60, 90, 120, 150, 180, 210, 240, 270, 300, 330,
];

interface FireworkOverlayProps {
  phase: Phase;
}

// Cover: a real black rocket rises then bursts into black spark rays -
// these are what actually blacken the screen (see BattleTransition/
// styles.css's battle-cover-firework-backdrop for the near-instant
// safety-net snap that catches whatever's left right at the very end).
// Reveal is a plain fade (styles.css's battle-reveal-firework-fade) - the
// pie-slice tear-apart effect this used to use moved to "clockwise"
// instead (variants/clockwise.tsx), which suits a clock-hand sweep's own
// exit better than a firework's.
const FireworkOverlay = ({ phase }: FireworkOverlayProps) => {
  if (phase !== "cover") {
    return null;
  }

  return (
    <div className={styles.fireworkField}>
      <div
        className={styles.fireworkBurst}
        style={
          {
            top: FIREWORK_BURST_POSITION.top,
            left: FIREWORK_BURST_POSITION.left,
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
    </div>
  );
};

export default FireworkOverlay;
