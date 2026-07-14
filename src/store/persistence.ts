import { PersistedGameState } from "./types";

const STATE_KEY_STORAGE_KEY = "stateKey";
const snapshotStorageKey = (key: string): string => `gameState:${key}`;

export const getStoredStateKey = (): string | null =>
  localStorage.getItem(STATE_KEY_STORAGE_KEY);

export const setStoredStateKey = (key: string): void => {
  localStorage.setItem(STATE_KEY_STORAGE_KEY, key);
};

// Scoped per state key - two different save slots must never be compared
// against (or overwrite) each other's cached snapshot.
export const getLocalSnapshot = (key: string): PersistedGameState | null => {
  try {
    const raw = localStorage.getItem(snapshotStorageKey(key));
    return raw ? (JSON.parse(raw) as PersistedGameState) : null;
  } catch {
    return null;
  }
};

export const setLocalSnapshot = (
  key: string,
  state: PersistedGameState
): void => {
  localStorage.setItem(snapshotStorageKey(key), JSON.stringify(state));
};

// Whichever of local/remote was saved more recently wins; if only one exists,
// it wins by default.
export const resolveHydratedState = (
  local: PersistedGameState | null,
  remote: PersistedGameState | null
): PersistedGameState | null =>
  remote && (!local || remote.timestamp >= local.timestamp) ? remote : local;

export const loadRemoteState = (
  key: string
): Promise<PersistedGameState | null> =>
  new Promise((resolve) => {
    if (typeof google === "undefined") {
      resolve(null);
      return;
    }
    google.script.run
      .withSuccessHandler<string | null>((json) => {
        try {
          resolve(json ? (JSON.parse(json) as PersistedGameState) : null);
        } catch {
          resolve(null);
        }
      })
      .withFailureHandler(() => resolve(null))
      .loadState(key);
  });

// Resolves true/false rather than throwing, so callers (the retry controller)
// can decide what to do next instead of losing the failure in an
// unhandled rejection.
export const saveRemoteState = (
  key: string,
  state: PersistedGameState
): Promise<boolean> =>
  new Promise((resolve) => {
    if (typeof google === "undefined") {
      resolve(false);
      return;
    }
    google.script.run
      .withSuccessHandler(() => resolve(true))
      .withFailureHandler(() => resolve(false))
      .saveState(key, JSON.stringify(state));
  });
