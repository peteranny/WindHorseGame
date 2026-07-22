// Shared between BattleTransition (which plays these stages) and Battle
// (whose own sprite-entrance/intro-text animations are delayed relative to
// DISTORT_OUT_MS - see below) - kept in one place so the two can never
// drift out of sync with each other.
export const FREEZE_MS = 300;
export const FLASH_MS = 360;
export const DISTORT_IN_MS = 900;
// Battle itself only ever mounts right as this final "reveal" stage starts
// (BattleTransition swaps the actual map/battle content the instant the
// distortion is fully, opaquely covering the screen, then starts clearing
// it) - so DISTORT_OUT_MS doubles as Battle's own base delay before its
// sprite-entrance/intro-text animations start, timed from Battle's own
// mount rather than from this whole sequence's start.
export const DISTORT_OUT_MS = 600;
