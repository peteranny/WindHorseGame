// Shared between BattleTransition (which plays these stages) and Battle
// (whose own sprite-entrance/intro-text animations are delayed relative to
// REMAINING_OVERLAY_MS - see below) - kept in one place so the two can
// never drift out of sync with each other.
export const FREEZE_MS = 300;
// The white flash pulses FLASH_REPEAT times rather than just once - each
// individual pulse is FLASH_PULSE_MS (played via CSS animation-iteration-
// count, see styles.css's .flash), so the phase as a whole (what the
// setTimeout chain in index.tsx actually waits on) takes their product.
export const FLASH_PULSE_MS = 360;
export const FLASH_REPEAT = 3;
export const FLASH_MS = FLASH_PULSE_MS * FLASH_REPEAT;
export const DISTORT_IN_MS = 900;
// Once "cover" finishes growing (screen fully, solidly black - see
// styles.css's battle-cover-* keyframes' own 100% frame), BattleTransition
// swaps the actual map/battle content right then but holds the solid black
// screen for this long *before* starting to open back up - a deliberate
// beat of pure black, not an instant cut, so the content swap underneath
// reads as having genuinely happened "in the dark" rather than in a single
// blink.
export const COVERED_HOLD_MS = 1000;
export const DISTORT_OUT_MS = 600;
// Battle itself only ever mounts right as the solid-black hold begins (the
// same instant BattleTransition swaps the content), which is still
// COVERED_HOLD_MS + DISTORT_OUT_MS before the overlay is actually, fully
// gone - so this (not DISTORT_OUT_MS alone) is Battle's own base delay
// before its sprite-entrance/intro-text sequence starts, timed from
// Battle's own mount rather than from this whole sequence's start.
export const REMAINING_OVERLAY_MS = COVERED_HOLD_MS + DISTORT_OUT_MS;
