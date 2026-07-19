import { create } from "zustand";
import { PROTAGONIST_MAX_HP } from "../data/monsters/battleFormulas";
import { BattleOutcome } from "../data/conversations/engine";

type Mode = "map" | "conversation" | "battle";
type TalkingSpeaker = "protagonist" | "monster" | "narration" | null;

interface FlowState {
  mode: Mode;
  activeMonsterId: number | null;
  // The map's one-off 'F' goal tile - a separate encounter from any
  // monster's (activeMonsterId stays null for it). Its conversation can
  // still lead into battle, same as a monster's (see Battle/ConversationView).
  isGoalEncounter: boolean;
  battleOutcome: BattleOutcome | null;
  talkingSpeaker: TalkingSpeaker;
  wildHp: number;
  wildMaxHp: number;
  protagonistHp: number;
  // Dev-only, toggled from the map screen's compact icon row (only shown
  // under a dev save key - see store/devMode.ts) - never persisted, resets
  // every session. The battle screen's own win/lose shortcuts have no
  // separate toggle - they just always show once the save key qualifies.
  devReleaseEnabled: boolean; // click a duckling-trail follower to un-capture it
  // Bypasses gameStore.battleCooldowns entirely while on, same as
  // goalDefeatedAt already does permanently once the goal's been cleared -
  // see ConversationView's own isOnBattleCooldown check. Only shown/relevant
  // before that point (Game/index.tsx swaps this toggle out for the
  // "reset ever-clear" button once goalDefeatedAt is set, since the lock is
  // disabled forever from then on anyway).
  devCooldownLockDisabled: boolean;
  startEncounter: (monsterId: number) => void;
  startGoalEncounter: () => void;
  enterBattle: (wildMaxHp: number) => void;
  damageWild: (amount: number) => void;
  healWild: (amount: number) => void;
  damageProtagonist: (amount: number) => void;
  healProtagonist: (amount: number) => void;
  concludeBattle: (outcome: BattleOutcome) => void;
  endEncounter: () => void;
  setTalkingSpeaker: (speaker: TalkingSpeaker) => void;
  setDevReleaseEnabled: (enabled: boolean) => void;
  setDevCooldownLockDisabled: (enabled: boolean) => void;
}

export const useFlowStore = create<FlowState>((set) => ({
  mode: "map",
  activeMonsterId: null,
  isGoalEncounter: false,
  battleOutcome: null,
  talkingSpeaker: null,
  wildHp: 0,
  wildMaxHp: 0,
  protagonistHp: PROTAGONIST_MAX_HP,
  devReleaseEnabled: false,
  devCooldownLockDisabled: false,
  startEncounter: (monsterId) =>
    set({ mode: "conversation", activeMonsterId: monsterId }),
  startGoalEncounter: () =>
    set({ mode: "conversation", isGoalEncounter: true }),
  enterBattle: (wildMaxHp) =>
    set({
      mode: "battle",
      wildHp: wildMaxHp,
      wildMaxHp,
      protagonistHp: PROTAGONIST_MAX_HP,
    }),
  damageWild: (amount) =>
    set((state) => ({ wildHp: Math.max(0, state.wildHp - amount) })),
  healWild: (amount) =>
    set((state) => ({
      wildHp: Math.min(state.wildMaxHp, state.wildHp + amount),
    })),
  damageProtagonist: (amount) =>
    set((state) => ({
      protagonistHp: Math.max(0, state.protagonistHp - amount),
    })),
  healProtagonist: (amount) =>
    set((state) => ({
      protagonistHp: Math.min(PROTAGONIST_MAX_HP, state.protagonistHp + amount),
    })),
  concludeBattle: (outcome) =>
    set({ mode: "conversation", battleOutcome: outcome }),
  endEncounter: () =>
    set({
      mode: "map",
      activeMonsterId: null,
      isGoalEncounter: false,
      battleOutcome: null,
      talkingSpeaker: null,
    }),
  setTalkingSpeaker: (speaker) => set({ talkingSpeaker: speaker }),
  setDevReleaseEnabled: (enabled) => set({ devReleaseEnabled: enabled }),
  setDevCooldownLockDisabled: (enabled) =>
    set({ devCooldownLockDisabled: enabled }),
}));
