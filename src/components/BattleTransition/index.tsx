import React, { useEffect, useRef, useState } from "react";
import cn from "classnames";
import styles from "./styles.css";
import {
  FREEZE_MS,
  FLASH_MS,
  DISTORT_IN_MS,
  COVERED_HOLD_MS,
  DISTORT_OUT_MS,
} from "./timing";

// One full pass through this sequence plays every time flowStore.mode
// transitions into "battle" (not on the way out - leaving battle just
// swaps back to otherContent instantly, no distortion). "freeze"/"flash"
// have no distortion pattern of their own; "cover" and "reveal" both wear
// whichever variant was rolled for this transition, growing in then
// shrinking back out again.
type Phase = "idle" | "freeze" | "flash" | "cover" | "reveal";
type Variant = "radial" | "stripes" | "particles";
const VARIANTS: Variant[] = ["radial", "stripes", "particles"];

interface BattleTransitionProps {
  mode: string;
  battleContent: React.ReactNode;
  otherContent: React.ReactNode;
}

const BattleTransition = ({
  mode,
  battleContent,
  otherContent,
}: BattleTransitionProps) => {
  const [phase, setPhase] = useState<Phase>("idle");
  const [variant, setVariant] = useState<Variant>(VARIANTS[0]);
  // Which content is actually mounted right now - the whole point of this
  // component. On every edge except entering battle, this just tracks
  // `mode` directly (an instant swap, no crossfade). On the entering-battle
  // edge specifically, it stays "other" (the map/dialog, fully opaque, no
  // fade of its own) all the way through "freeze"/"flash"/"cover" and only
  // flips to "battle" the instant the distortion is fully, opaquely
  // covering the screen - so the actual scene swap happens completely
  // hidden underneath it, with nothing ever visible mid-fade.
  const [displayed, setDisplayed] = useState<"battle" | "other">(
    mode === "battle" ? "battle" : "other"
  );
  const prevModeRef = useRef(mode);

  useEffect(() => {
    const prevMode = prevModeRef.current;
    prevModeRef.current = mode;
    const enteringBattle = prevMode !== "battle" && mode === "battle";
    if (!enteringBattle) {
      setDisplayed(mode === "battle" ? "battle" : "other");
      setPhase("idle");
      return undefined;
    }

    // Rolled once per transition (not per phase), so "cover" and "reveal"
    // always wear the same pattern as each other.
    setVariant(VARIANTS[Math.floor(Math.random() * VARIANTS.length)]);
    setPhase("freeze");

    const coveredAt = FREEZE_MS + FLASH_MS + DISTORT_IN_MS;
    const timers = [
      setTimeout(() => setPhase("flash"), FREEZE_MS),
      setTimeout(() => setPhase("cover"), FREEZE_MS + FLASH_MS),
      setTimeout(() => {
        // Fully, solidly black right now (see styles.css's battle-cover-*
        // keyframes' own 100% frame) - swap the underlying content here,
        // instantly and invisibly, rather than letting it crossfade on its
        // own independent timeline the way a plain opacity transition
        // would (which used to be visible through the still-transparent
        // freeze/flash stages before this content-swap was gated on
        // "cover" actually finishing). `phase` deliberately stays "cover"
        // for COVERED_HOLD_MS more - the black screen just keeps holding
        // (its own animation already ended on that solid final frame) while
        // Battle mounts underneath it, rather than starting to clear away
        // in the very same instant.
        setDisplayed("battle");
      }, coveredAt),
      setTimeout(() => setPhase("reveal"), coveredAt + COVERED_HOLD_MS),
      setTimeout(
        () => setPhase("idle"),
        coveredAt + COVERED_HOLD_MS + DISTORT_OUT_MS
      ),
    ];
    return () => timers.forEach(clearTimeout);
  }, [mode]);

  return (
    <div className={styles.stack}>
      <div className={styles.layer}>
        {displayed === "battle" ? battleContent : otherContent}
      </div>
      {phase !== "idle" && (
        <div
          className={cn(
            styles.overlay,
            (phase === "cover" || phase === "reveal") && styles[variant],
            phase === "cover" && styles.cover,
            phase === "reveal" && styles.reveal
          )}
          aria-hidden="true"
        >
          {phase === "flash" && <div className={styles.flash} />}
        </div>
      )}
    </div>
  );
};

export default BattleTransition;
