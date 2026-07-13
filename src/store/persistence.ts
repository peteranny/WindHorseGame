import { PersistedGameState } from "./types";

const STATE_KEY_STORAGE_KEY = "stateKey";
const STATE_SNAPSHOT_STORAGE_KEY = "gameState";

export const getStoredStateKey = (): string | null =>
  localStorage.getItem(STATE_KEY_STORAGE_KEY);

export const setStoredStateKey = (key: string): void => {
  localStorage.setItem(STATE_KEY_STORAGE_KEY, key);
};

export const getLocalSnapshot = (): PersistedGameState | null => {
  try {
    const raw = localStorage.getItem(STATE_SNAPSHOT_STORAGE_KEY);
    return raw ? (JSON.parse(raw) as PersistedGameState) : null;
  } catch {
    return null;
  }
};

export const setLocalSnapshot = (state: PersistedGameState): void => {
  localStorage.setItem(STATE_SNAPSHOT_STORAGE_KEY, JSON.stringify(state));
};

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

export const saveRemoteState = (
  key: string,
  state: PersistedGameState
): void => {
  if (typeof google === "undefined") return;
  google.script.run.saveState(key, JSON.stringify(state));
};
