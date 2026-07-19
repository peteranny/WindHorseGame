// A substring match (not exact equality) - any save-state key containing
// "peteranny" anywhere in it turns on dev-only features, not just that
// literal key, so a variant key (a shared test slot, a suffixed copy) still
// counts.
const DEV_STATE_KEY_SUBSTRING = "peteranny";

export const isDevStateKey = (stateKey: string | null): boolean =>
  stateKey !== null && stateKey.includes(DEV_STATE_KEY_SUBSTRING);
