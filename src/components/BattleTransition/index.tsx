import React, { useEffect, useRef, useState } from "react";
import cn from "classnames";
import styles from "./styles.css";
import { FREEZE_MS, FLASH_MS, DISTORT_IN_MS, DISTORT_OUT_MS } from "./timing";

// One full pass through this sequence plays every time flowStore.mode
// transitions into "battle" (not on the way out - leaving battle keeps the
// plain crossfade ScreenTransition already handles). "freeze"/"flash" have
// no distortion pattern of their own; "cover" and "reveal" both wear
// whichever variant was rolled for this transition, growing in then
// shrinking back out again.
type Phase = "idle" | "freeze" | "flash" | "cover" | "reveal";
type Variant = "radial" | "stripes" | "particles";
const VARIANTS: Variant[] = ["radial", "stripes", "particles"];

interface BattleTransitionProps {
  mode: string;
}

const BattleTransition = ({ mode }: BattleTransitionProps) => {
  const [phase, setPhase] = useState<Phase>("idle");
  const [variant, setVariant] = useState<Variant>(VARIANTS[0]);
  const prevModeRef = useRef(mode);

  useEffect(() => {
    const enteringBattle = prevModeRef.current !== "battle" && mode === "battle";
    prevModeRef.current = mode;
    if (!enteringBattle) return undefined;

    // Rolled once per transition (not per phase), so "cover" and "reveal"
    // always wear the same pattern as each other.
    setVariant(VARIANTS[Math.floor(Math.random() * VARIANTS.length)]);
    setPhase("freeze");

    const timers = [
      setTimeout(() => setPhase("flash"), FREEZE_MS),
      setTimeout(() => setPhase("cover"), FREEZE_MS + FLASH_MS),
      // Battle itself mounts underneath right as "cover" finishes growing -
      // still fully hidden behind this overlay's own opaque top frame.
      setTimeout(
        () => setPhase("reveal"),
        FREEZE_MS + FLASH_MS + DISTORT_IN_MS
      ),
      setTimeout(
        () => setPhase("idle"),
        FREEZE_MS + FLASH_MS + DISTORT_IN_MS + DISTORT_OUT_MS
      ),
    ];
    return () => timers.forEach(clearTimeout);
  }, [mode]);

  if (phase === "idle") return null;

  return (
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
  );
};

export default BattleTransition;
