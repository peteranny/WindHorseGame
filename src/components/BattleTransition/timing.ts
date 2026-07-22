// Shared between BattleTransition (which plays these stages) and Battle
// (whose own sprite-entrance/intro-text animations are delayed to start
// exactly once the last of these has finished covering the screen) - kept
// in one place so the two can never drift out of sync with each other.
export const FREEZE_MS = 500;
export const FLASH_MS = 600;
export const DISTORT_IN_MS = 1500;
export const DISTORT_OUT_MS = 1000;

// The moment the distortion has fully cleared and the battle scene
// underneath is completely visible - Battle's own entrance sequence starts
// counting from here, not from its own mount time (which happens earlier,
// while still hidden behind the still-covering overlay).
export const OVERLAY_TOTAL_MS = FREEZE_MS + FLASH_MS + DISTORT_IN_MS + DISTORT_OUT_MS;
