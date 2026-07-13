import { create } from "zustand";
import {
  getLocalSnapshot,
  getStoredStateKey,
  loadRemoteState,
  saveRemoteState,
  setLocalSnapshot,
  setStoredStateKey,
} from "./persistence";
import { PersistedGameState } from "./types";
import { captureMonster as captureMonsterPure } from "../data/monsters/captureLogic";

const DEFAULT_POSITION: [number, number] = [2, 1];
const SAVE_DEBOUNCE_MS = 500;

interface GameState {
  hydrated: boolean;
  stateKey: string | null;
  position: [number, number];
  captured: Record<number, string>;
  cooldowns: Record<string, number>;
  setStateKey: (key: string) => Promise<void>;
  setPosition: (x: number, y: number) => void;
  captureMonster: (monsterId: number, capturedAt?: string) => void;
  setCooldown: (key: string, availableAt: number) => void;
  hydrate: () => Promise<void>;
}

const toPersisted = (state: GameState): PersistedGameState => ({
  position: state.position,
  captured: state.captured,
  cooldowns: state.cooldowns,
  timestamp: Date.now(),
});

let saveTimer: ReturnType<typeof setTimeout> | null = null;

const scheduleSave = (): void => {
  const state = useGameStore.getState();
  if (!state.hydrated) return;
  const snapshot = toPersisted(state);
  setLocalSnapshot(snapshot);
  if (saveTimer) clearTimeout(saveTimer);
  saveTimer = setTimeout(() => {
    if (state.stateKey) saveRemoteState(state.stateKey, snapshot);
  }, SAVE_DEBOUNCE_MS);
};

export const useGameStore = create<GameState>((set, get) => ({
  hydrated: false,
  stateKey: getStoredStateKey(),
  position: DEFAULT_POSITION,
  captured: {},
  cooldowns: {},

  setStateKey: async (key) => {
    setStoredStateKey(key);
    set({ stateKey: key, hydrated: false });
    await get().hydrate();
  },

  setPosition: (x, y) => {
    set({ position: [x, y] });
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

  hydrate: async () => {
    const key = get().stateKey;
    const local = getLocalSnapshot();
    const remote = key ? await loadRemoteState(key) : null;
    const winner =
      remote && (!local || remote.timestamp >= local.timestamp)
        ? remote
        : local;
    set({
      position: winner?.position ?? DEFAULT_POSITION,
      captured: winner?.captured ?? {},
      cooldowns: winner?.cooldowns ?? {},
      hydrated: true,
    });
  },
}));
