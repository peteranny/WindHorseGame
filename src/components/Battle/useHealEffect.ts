import { useCallback, useRef, useState } from "react";
import { EFFECT_DURATION_MS } from "./spriteEffects";

// "heal" is the only sprite effect still driven by React state/CSS class -
// see this hook and spriteEffects.ts's playBump for why attack/hit moved
// off this.
export type HealEffect = "heal" | null;

// A heal's own glow builds, holds, and releases over this much longer span
// (rather than EFFECT_DURATION_MS's quick attack/hit flash) - the target's
// HP only actually recovers once this whole animation finishes.
export const HEAL_ANIMATION_MS = 3000;

export const useHealEffect = (): [
  HealEffect,
  (effect: HealEffect, durationMs?: number) => void
] => {
  const [effect, setEffect] = useState<HealEffect>(null);
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const trigger = useCallback(
    (next: HealEffect, durationMs: number = EFFECT_DURATION_MS) => {
      setEffect(next);
      if (timeoutRef.current) clearTimeout(timeoutRef.current);
      timeoutRef.current = setTimeout(() => setEffect(null), durationMs);
    },
    []
  );
  return [effect, trigger];
};
