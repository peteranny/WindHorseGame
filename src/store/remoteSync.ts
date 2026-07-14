import { PersistedGameState } from "./types";

export interface RemoteSyncDeps {
  save: (key: string, state: PersistedGameState) => Promise<boolean>;
}

export interface RemoteSyncController {
  scheduleSave: (key: string, state: PersistedGameState) => void;
  retryPending: () => void;
  clearPending: () => void;
  hasPending: () => boolean;
}

interface PendingWrite {
  key: string;
  state: PersistedGameState;
}

// Tracks at most one unsynced write at a time - the latest one supersedes any
// earlier write still in flight or waiting to be retried. A failed save is
// never retried automatically (that would busy-loop while offline); it just
// stays pending until something external calls retryPending() (an "online"
// event, a periodic fallback timer, or another scheduleSave for the same key).
export const createRemoteSync = (
  deps: RemoteSyncDeps
): RemoteSyncController => {
  let pending: PendingWrite | null = null;
  let inFlight = false;

  const attempt = (): void => {
    if (!pending || inFlight) return;
    const target = pending;
    inFlight = true;
    deps.save(target.key, target.state).then((success) => {
      inFlight = false;
      if (success && pending === target) {
        pending = null;
      }
      // On failure (or if a newer write already superseded this one), leave
      // `pending` as-is - the next external retry trigger will pick it up.
    });
  };

  return {
    scheduleSave(key, state) {
      pending = { key, state };
      attempt();
    },
    retryPending() {
      attempt();
    },
    clearPending() {
      pending = null;
    },
    hasPending() {
      return pending !== null;
    },
  };
};
