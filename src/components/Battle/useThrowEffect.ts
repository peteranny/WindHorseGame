import { useCallback, useRef, useState } from "react";
import { Point } from "./geometry";

export const THROW_DURATION_MS = 2000;

export interface ThrowEffect {
  id: number;
  icon: string;
  from: Point;
  to: Point;
  // A healer's own self-toss (selfPlayer - identical from/to, see
  // Battle/index.tsx's getTrajectory) still arcs up and down in place, but
  // shouldn't also shrink like a real cross-battlefield throw does - that
  // shrink reads as "flying into the distance", which never happens here.
  selfToss: boolean;
}

// Every captured monster currently mid-throw at the wild monster (the
// innate fist attack has nothing to throw, so it never uses this). Each
// throw gets its own id, removed only by its own onAnimationEnd (see
// .thrownIcon's render in Battle/index.tsx) rather than a separately-tracked
// setTimeout - a parallel JS timer has to be kept exactly in sync with the
// CSS animation's own duration by convention, and any drift between the two
// (rendering jank, batched updates) leaves a landed, no-longer-animating
// icon frozen on screen (animation-fill-mode: forwards holds its last
// frame) until the timer eventually catches up. Tying removal directly to
// the browser's own animationend event can't drift, so throwing a second
// monster before the first one lands still doesn't cut the first one's
// animation short - they each run to completion and self-remove independently.
//
// onAnimationEnd can still silently fail to fire at all in rare cases (a
// backgrounded/throttled tab pausing the CSS animation, a dropped event) -
// and because effects is an array rather than a single nullable slot, a
// throw that fails to clear this way doesn't just get replaced by the next
// one the way a single-slot effect would - it's a genuine leak, sitting in
// the array forever while later throws keep appending around it. trigger
// arms a generous safety-net timeout well past the animation's own real
// duration to guarantee eventual cleanup either way; clear(id) is already
// idempotent (filters by id), so calling it again after onAnimationEnd
// already did is a harmless no-op.
const THROW_SAFETY_NET_MS = THROW_DURATION_MS + 1000;

export const useThrowEffect = (): [
  ThrowEffect[],
  (icon: string, from: Point, to: Point, selfToss?: boolean) => void,
  (id: number) => void
] => {
  const [effects, setEffects] = useState<ThrowEffect[]>([]);
  const nextIdRef = useRef(0);
  const clear = useCallback((id: number) => {
    setEffects((current) => current.filter((effect) => effect.id !== id));
  }, []);
  const trigger = useCallback(
    (icon: string, from: Point, to: Point, selfToss: boolean = false) => {
      nextIdRef.current += 1;
      const id = nextIdRef.current;
      setEffects((current) => [...current, { id, icon, from, to, selfToss }]);
      setTimeout(() => clear(id), THROW_SAFETY_NET_MS);
    },
    [clear]
  );
  return [effects, trigger, clear];
};
