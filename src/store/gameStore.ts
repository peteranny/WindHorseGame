import { create } from "zustand";
import {
  getLocalSnapshot,
  getStoredStateKey,
  loadRemoteState,
  saveRemoteState,
  setLocalSnapshot,
  setStoredStateKey,
} from "./persistence";
import { Facing, PersistedGameState } from "./types";
import { captureMonster as captureMonsterPure } from "../data/monsters/captureLogic";

const DEFAULT_POSITION: [number, number] = [2, 1];
const DEFAULT_FACING: Facing = "left";
const SAVE_DEBOUNCE_MS = 500;

interface GameState {
  hydrated: boolean;
  stateKey: string | null;
  position: [number, number];
  facing: Facing;
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
  facing: state.facing,
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
  facing: DEFAULT_FACING,
  captured: {},
  cooldowns: {},

  setStateKey: (key) => {
    setStoredStateKey(key);
    set({ stateKey: key, hydrated: false });
    return get().hydrate();
  },

  setPosition: (x, y) => {
    set((state) => ({
      position: [x, y],
      facing:
        x > state.position[0] ? "right" : x < state.position[0] ? "left" : state.facing,
    }));
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

  hydrate: () => {
    const key = get().stateKey;
    const local = getLocalSnapshot();
    return (key ? loadRemoteState(key) : Promise.resolve(null)).then(
      (remote) => {
        const winner =
          remote && (!local || remote.timestamp >= local.timestamp)
            ? remote
            : local;
        set({
          position: winner?.position ?? DEFAULT_POSITION,
          facing: winner?.facing ?? DEFAULT_FACING,
          captured: winner?.captured ?? {},
          cooldowns: winner?.cooldowns ?? {},
          hydrated: true,
        });
      }
    );
  },
}));
