import { create } from "zustand";
import {
  getLocalSnapshot,
  getStoredStateKey,
  loadRemoteState,
  resolveHydratedState,
  saveRemoteState,
  setLocalSnapshot,
  setStoredStateKey,
} from "./persistence";
import { createRemoteSync } from "./remoteSync";
import { Facing, PersistedGameState } from "./types";
import { captureMonster as captureMonsterPure } from "../data/monsters/captureLogic";
import { revealCells as revealCellsPure } from "../components/Maze/exploration";

const DEFAULT_POSITION: [number, number] = [2, 1];
const DEFAULT_FACING: Facing = "left";
const SAVE_DEBOUNCE_MS = 500;
const RETRY_INTERVAL_MS = 30000;

interface GameState {
  hydrated: boolean;
  stateKey: string | null;
  position: [number, number];
  facing: Facing;
  captured: Record<number, string>;
  cooldowns: Record<string, number>;
  exploredCells: Record<string, true>;
  setStateKey: (key: string) => Promise<void>;
  setPosition: (x: number, y: number) => void;
  captureMonster: (monsterId: number, capturedAt?: string) => void;
  setCooldown: (key: string, availableAt: number) => void;
  revealCells: (cells: Array<[number, number]>) => void;
  hydrate: () => Promise<void>;
}

const toPersisted = (state: GameState): PersistedGameState => ({
  position: state.position,
  facing: state.facing,
  captured: state.captured,
  cooldowns: state.cooldowns,
  exploredCells: state.exploredCells,
  timestamp: Date.now(),
});

const remoteSync = createRemoteSync({ save: saveRemoteState });

// A failed remote save is never retried on a timer of its own (see
// remoteSync.ts) - something external has to ask it to try again. The
// "online" event covers the common case (the connection actually dropped);
// the periodic sweep is a fallback for anything that event doesn't catch.
if (typeof window !== "undefined") {
  window.addEventListener("online", () => remoteSync.retryPending());
  setInterval(() => remoteSync.retryPending(), RETRY_INTERVAL_MS);
}

let saveTimer: ReturnType<typeof setTimeout> | null = null;

const scheduleSave = (): void => {
  const state = useGameStore.getState();
  if (!state.hydrated || !state.stateKey) return;
  const key = state.stateKey;
  const snapshot = toPersisted(state);
  setLocalSnapshot(key, snapshot);
  if (saveTimer) clearTimeout(saveTimer);
  saveTimer = setTimeout(() => {
    remoteSync.scheduleSave(key, snapshot);
  }, SAVE_DEBOUNCE_MS);
};

export const useGameStore = create<GameState>((set, get) => ({
  hydrated: false,
  stateKey: getStoredStateKey(),
  position: DEFAULT_POSITION,
  facing: DEFAULT_FACING,
  captured: {},
  cooldowns: {},
  exploredCells: {},

  setStateKey: (key) => {
    // Switching save slots abandons any not-yet-synced write for the old
    // key rather than keeping it around to retry against the wrong slot.
    remoteSync.clearPending();
    setStoredStateKey(key);
    set({ stateKey: key, hydrated: false });
    return get().hydrate();
  },

  setPosition: (x, y) => {
    set((state) => {
      const [prevX, prevY] = state.position;
      const facing: Facing =
        x > prevX
          ? "right"
          : x < prevX
          ? "left"
          : y > prevY
          ? "down"
          : y < prevY
          ? "up"
          : state.facing;
      return { position: [x, y], facing };
    });
    scheduleSave();
  },

  captureMonster: (monsterId, capturedAt = new Date().toISOString()) => {
    set((state) => ({
      captured: captureMonsterPure(state.captured, monsterId, capturedAt),
    }));
    scheduleSave();
  },

  setCooldown: (key, availableAt) => {
    set((state) => ({
      cooldowns: { ...state.cooldowns, [key]: availableAt },
    }));
    scheduleSave();
  },

  revealCells: (cells) => {
    set((state) => ({
      exploredCells: revealCellsPure(state.exploredCells, cells),
    }));
    scheduleSave();
  },

  hydrate: () => {
    const key = get().stateKey;
    const local = key ? getLocalSnapshot(key) : null;
    return (key ? loadRemoteState(key) : Promise.resolve(null)).then(
      (remote) => {
        const winner = resolveHydratedState(local, remote);
        const position = winner?.position ?? DEFAULT_POSITION;
        set({
          position,
          facing: winner?.facing ?? DEFAULT_FACING,
          captured: winner?.captured ?? {},
          cooldowns: winner?.cooldowns ?? {},
          // The player's starting/restored cell is always explored, even on
          // a brand new save with nothing explored yet.
          exploredCells: revealCellsPure(winner?.exploredCells ?? {}, [
            position,
          ]),
          hydrated: true,
        });
      }
    );
  },
}));
