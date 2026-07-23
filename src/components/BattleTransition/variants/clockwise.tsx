import React from "react";
import cn from "classnames";
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
//
// Each shard's own delay (index * 20ms, max 140ms at index 7) plus its
// animation-duration (clockwise.css's 550ms) must together stay under
// BattleTransition/timing.ts's DISTORT_OUT_MS (600ms, the "reveal" phase's
// own length) - index.tsx unmounts this whole overlay the instant `phase`
// leaves "reveal", so a shard whose delay+duration overruns that window
// gets yanked off mid-flight (still visibly opaque/mid-tumble) instead of
// finishing its own fade to invisible.
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

// Rendered throughout "cover" (including its own hold) as well as
// "reveal" - not just reveal - so the shard elements are already mounted
// and painted (at rest, invisible - see .tearShard's own opacity: 0) well
// before reveal ever begins. Mounting them only on reveal used to race the
// shared .overlay's own background snapping to transparent at that same
// instant: a brand-new DOM subtree's first paint isn't guaranteed to land
// in the very same frame as a plain style change, so the battle scene
// underneath could flash through for a frame before the shards caught up.
// Toggling styles.tearShardFlying on already-mounted elements instead is
// just another style change on the same commit, landing atomically
// alongside the background swap. Cover itself still reads as a pure CSS
// conic-gradient sweep (styles.cover.clockwise) - the shards sit
// invisible on top of it the whole time, doing nothing.
const ClockwiseOverlay = ({ phase }: ClockwiseOverlayProps) => {
  if (phase !== "cover" && phase !== "reveal") {
    return null;
  }
  const isRevealing = phase === "reveal";

  return (
    <div className={styles.tearField}>
      {TEAR_WEDGES.map((wedge, index) => (
        <div
          key={index}
          className={cn(styles.tearShard, isRevealing && styles.tearShardFlying)}
          style={
            {
              clipPath: wedge.clipPath,
              "--tear-x": wedge.x,
              "--tear-y": wedge.y,
              "--tear-rotate": wedge.rotate,
              "--tear-delay": `${index * 20}ms`,
            } as React.CSSProperties
          }
        />
      ))}
    </div>
  );
};

export default ClockwiseOverlay;
