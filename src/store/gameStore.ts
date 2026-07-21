import { create } from "zustand";
import {
  getLocalSnapshot,
  getStateKeyFromUrl,
  loadRemoteState,
  resolveHydratedState,
  saveRemoteState,
  setLocalSnapshot,
  setStateKeyInUrl,
} from "./persistence";
import { createRemoteSync } from "./remoteSync";
import { Facing, PersistedGameState } from "./types";
import {
  captureMonster as captureMonsterPure,
  releaseMonster as releaseMonsterPure,
} from "../data/monsters/captureLogic";
import { recordGoalWin as recordGoalWinPure } from "../data/goalEncounter";
import { revealCells as revealCellsPure } from "../components/Maze/exploration";
import {
  addToOrder as addToOrderPure,
  orderByMostRecentlyCaptured,
  removeFromOrder as removeFromOrderPure,
} from "../components/Maze/followerTrail";

const DEFAULT_POSITION: [number, number] = [2, 1];
const DEFAULT_FACING: Facing = "left";
const SAVE_DEBOUNCE_MS = 500;
const RETRY_INTERVAL_MS = 30000;

interface GameState {
  hydrated: boolean;
  stateKey: string | null;
  position: [number, number];
  // The cell the player moved from to reach `position` - persisted purely so
  // the duckling trail (see Maze/followerTrail.ts) has a real one-cell
  // segment to seed itself from on load, instead of every follower stacking
  // on a single fallback point until the player takes their first step this
  // session. Null only when the player has never moved yet.
  previousPosition: [number, number] | null;
  facing: Facing;
  captured: Record<number, string>;
  // Front-to-back order shared by the duckling follower trail and the
  // battle attack line - see store/types.ts's own comment on this field.
  monsterOrder: number[];
  cooldowns: Record<string, number>;
  battleCooldowns: Record<string, number>;
  exploredCells: Record<string, true>;
  goalDefeatedAt: string | null;
  setStateKey: (key: string) => Promise<void>;
  setPosition: (x: number, y: number) => void;
  // Same effect as setPosition, but for a jump rather than a walked step
  // (the mini-map's tap-to-teleport) - previousPosition becomes the same
  // cell as position instead of wherever the player jumped from, so a
  // reload right after a teleport doesn't seed the duckling trail (see
  // previousPosition's own comment below) as spanning the jump itself.
  teleportTo: (x: number, y: number) => void;
  setFacing: (facing: Facing) => void;
  captureMonster: (monsterId: number, capturedAt?: string) => void;
  releaseMonster: (monsterId: number) => void;
  recordGoalWin: (defeatedAt?: string) => void;
  resetGoalDefeatedAt: () => void;
  setCooldown: (key: string, availableAt: number) => void;
  setBattleCooldown: (key: string, availableAt: number) => void;
  revealCells: (cells: Array<[number, number]>) => void;
  reorderMonsters: (order: number[]) => void;
  hydrate: () => Promise<void>;
}

const toPersisted = (state: GameState): PersistedGameState => ({
  position: state.position,
  previousPosition: state.previousPosition,
  facing: state.facing,
  captured: state.captured,
  monsterOrder: state.monsterOrder,
  cooldowns: state.cooldowns,
  battleCooldowns: state.battleCooldowns,
  exploredCells: state.exploredCells,
  goalDefeatedAt: state.goalDefeatedAt,
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
  stateKey: getStateKeyFromUrl(),
  position: DEFAULT_POSITION,
  previousPosition: null,
  facing: DEFAULT_FACING,
  captured: {},
  monsterOrder: [],
  cooldowns: {},
  battleCooldowns: {},
  exploredCells: {},
  goalDefeatedAt: null,

  setStateKey: (key) => {
    // Switching save slots abandons any not-yet-synced write for the old
    // key rather than keeping it around to retry against the wrong slot.
    remoteSync.clearPending();
    setStateKeyInUrl(key);
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
      return { position: [x, y], previousPosition: state.position, facing };
    });
    scheduleSave();
  },

  teleportTo: (x, y) => {
    set({ position: [x, y], previousPosition: [x, y] });
    scheduleSave();
  },

  setFacing: (facing) => {
    set({ facing });
    scheduleSave();
  },

  captureMonster: (monsterId, capturedAt = new Date().toISOString()) => {
    set((state) => {
      const captured = captureMonsterPure(
        state.captured,
        monsterId,
        capturedAt
      );
      // captureMonsterPure returns the same reference for an already-
      // captured monster - only a genuinely new capture joins the order.
      const monsterOrder =
        captured === state.captured
          ? state.monsterOrder
          : addToOrderPure(state.monsterOrder, monsterId);
      return { captured, monsterOrder };
    });
    scheduleSave();
  },

  releaseMonster: (monsterId) => {
    set((state) => ({
      captured: releaseMonsterPure(state.captured, monsterId),
      monsterOrder: removeFromOrderPure(state.monsterOrder, monsterId),
    }));
    scheduleSave();
  },

  recordGoalWin: (defeatedAt = new Date().toISOString()) => {
    set((state) => ({
      goalDefeatedAt: recordGoalWinPure(state.goalDefeatedAt, defeatedAt),
    }));
    scheduleSave();
  },

  // Dev-only (see Game's own ♻️ button, shown under a dev save key - store/
  // devMode.ts) - undoes recordGoalWin's first-write-wins guard so the goal
  // battle's "ever cleared" record can be replayed from scratch without a
  // whole separate save-state key.
  resetGoalDefeatedAt: () => {
    set({ goalDefeatedAt: null });
    scheduleSave();
  },

  setCooldown: (key, availableAt) => {
    set((state) => ({
      cooldowns: { ...state.cooldowns, [key]: availableAt },
    }));
    scheduleSave();
  },

  setBattleCooldown: (key, availableAt) => {
    set((state) => ({
      battleCooldowns: { ...state.battleCooldowns, [key]: availableAt },
    }));
    scheduleSave();
  },

  revealCells: (cells) => {
    set((state) => ({
      exploredCells: revealCellsPure(state.exploredCells, cells),
    }));
    scheduleSave();
  },

  // Battle's own send-to-back/bring-to-front reordering (see
  // Battle/index.tsx) - persisted so the next battle, and the map's own
  // duckling train, both pick up wherever the order was last left.
  reorderMonsters: (order) => {
    set({ monsterOrder: order });
    scheduleSave();
  },

  hydrate: () => {
    const key = get().stateKey;
    const local = key ? getLocalSnapshot(key) : null;
    return (key ? loadRemoteState(key) : Promise.resolve(null)).then(
      (remote) => {
        const winner = resolveHydratedState(local, remote);
        const position = winner?.position ?? DEFAULT_POSITION;
        const captured = winner?.captured ?? {};
        set({
          position,
          previousPosition: winner?.previousPosition ?? null,
          facing: winner?.facing ?? DEFAULT_FACING,
          captured,
          // A save from before monsterOrder existed falls back to capture
          // order, same as the duckling trail/battle line always used to
          // show - from here on, order is explicit (see reorderMonsters).
          monsterOrder:
            winner?.monsterOrder ?? orderByMostRecentlyCaptured(captured),
          cooldowns: winner?.cooldowns ?? {},
          battleCooldowns: winner?.battleCooldowns ?? {},
          goalDefeatedAt: winner?.goalDefeatedAt ?? null,
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
