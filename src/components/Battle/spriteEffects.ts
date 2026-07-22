// Shared quick-flash duration for attack/hit bumps and other one-off sprite
// effects (heal glows use their own longer HEAL_ANIMATION_MS instead).
export const EFFECT_DURATION_MS = 300;

// The player's own filter-based heal glow (see useHealEffect) is the only
// sprite effect still driven by React state/className - a quick attack/hit
// bump instead plays via the Web Animations API, fired directly on the
// sprite's DOM node. That keeps it independent of (and unable to cut short)
// a concurrent heal glow: `animation`'s CSS shorthand can only ever resolve
// to one value per element, so two className-driven animations fight over
// the same slot and only the most recent wins - but a WAAPI animation and a
// CSS-class animation are separate mechanisms entirely, and here they also
// animate different properties (transform vs filter), so they can run at
// the same time with no conflict at all.
export const attackBumpKeyframes = (directionPx: number): Keyframe[] => [
  { transform: "translateX(0)" },
  { transform: `translateX(calc(${directionPx}px * var(--scale)))`, offset: 0.3 },
  { transform: "translateX(0)" },
];

export const hitBumpKeyframes = (rotateDeg: number): Keyframe[] => [
  { transform: "translateY(0) rotate(0deg)" },
  {
    transform: `translateY(calc(12px * var(--scale))) rotate(${rotateDeg}deg)`,
    offset: 0.4,
  },
  { transform: "translateY(0) rotate(0deg)" },
];

export const playBump = (
  el: HTMLElement | null,
  keyframes: Keyframe[],
  durationMs: number
): void => {
  el?.animate(keyframes, { duration: durationMs, easing: "ease" });
};
