import React from "react";
import styles from "./clockwise.css";
import { Phase } from "../types";

// The 8 pie-slice wedges this variant's own reveal shatters the screen
// into - (50%, 50%) plus two adjacent perimeter points (the 4 corners and
// the 4 edge-midpoints, in compass order) so their union exactly tiles the
// whole box with no gaps/overlap at rest, before each flies outward in its
// own direction on reveal. Originally built for "firework"'s own reveal -
// moved here since a shattering tear reads as a better fit for a clock-hand
// sweep's own exit than for firework (whose exit is now a plain fade - see
// BattleTransition/styles.css's battle-reveal-firework-fade).
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

interface ClockwiseOverlayProps {
  phase: Phase;
}

// Cover is a pure CSS conic-gradient sweep on the shared .overlay element
// (styles.cover.clockwise, BattleTransition/styles.css) - nothing to
// render here. Reveal shatters the screen into 8 pie-slice shards that fly
// apart, tearing it open to reveal the battle screen underneath.
const ClockwiseOverlay = ({ phase }: ClockwiseOverlayProps) => {
  if (phase !== "reveal") {
    return null;
  }

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
};

export default ClockwiseOverlay;
