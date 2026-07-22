import { useCallback, useRef, useState } from "react";
import { Point } from "./geometry";

export const SPIT_DURATION_MS = 500;

export interface SpitEffect {
  id: number;
  from: Point;
  to: Point;
  angleDeg: number;
}

// The innate attack's water-drop spit, shot straight from the player to the
// wild monster. Same onAnimationEnd-driven cleanup as useThrowEffect, for
// the same reason - no separate timer that could drift out of sync with
// the CSS animation it's meant to track. That primary path can still fail to
// fire at all in rare cases (a backgrounded/throttled tab pausing the CSS
// animation, a dropped animationend event) - since that leaves the spit
// stuck on screen indefinitely with nothing left to clear it, trigger also
// arms a generous safety-net timeout well past the animation's own real
// duration, so it never fires under normal conditions (onAnimationEnd
// already will have) and never fights the primary path - it only ever
// rescues a spit onAnimationEnd already failed to clear on its own. Guarded
// by id so a stale timeout from an earlier spit can't clear a newer one.
//
// Instantiated twice in Battle/index.tsx (once for the player's own spit,
// once for the wild monster's) - each keeps its own independent id counter
// starting at 1, so the two can (and regularly do, since the wild monster
// auto-attacks on its own timer) land on the same id at the same time. Both
// spans are still siblings under the same .battlefield parent though, so a
// bare key={id} on each was a real collision, not just a coincidence - React
// reconciles keys across a fiber's whole child list, not per JSX call site.
// That let the two spits get their DOM nodes/onAnimationEnd handlers
// crossed, which is what was actually causing a spit to occasionally never
// disappear - the render-site keys are namespaced (`player-spit-`/
// `enemy-spit-`) to rule this out for good, on top of the safety-net
// timeout above.
const SPIT_SAFETY_NET_MS = SPIT_DURATION_MS + 1000;

export const useSpitEffect = (): [
  SpitEffect | null,
  (from: Point, to: Point, angleDeg: number) => void,
  () => void
] => {
  const [effect, setEffect] = useState<SpitEffect | null>(null);
  const nextIdRef = useRef(0);
  const trigger = useCallback((from: Point, to: Point, angleDeg: number) => {
    nextIdRef.current += 1;
    const id = nextIdRef.current;
    setEffect({ id, from, to, angleDeg });
    setTimeout(() => {
      setEffect((current) => (current?.id === id ? null : current));
    }, SPIT_SAFETY_NET_MS);
  }, []);
  const clear = useCallback(() => setEffect(null), []);
  return [effect, trigger, clear];
};
