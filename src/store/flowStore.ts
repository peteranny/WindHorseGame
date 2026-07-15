import { create } from "zustand";
import { PROTAGONIST_MAX_HP } from "../data/monsters/battleFormulas";
import { BattleOutcome } from "../data/conversations/engine";

type Mode = "map" | "conversation" | "battle";
type TalkingSpeaker = "protagonist" | "monster" | null;

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
  // Both dev-only: toggled independently from the Settings screen (only
  // visible under the "peteranny" save key) - never persisted, resets
  // every session.
  devBattleShortcutsEnabled: boolean; // "Capture"/"Lose" buttons in Battle
  devReleaseEnabled: boolean; // click a duckling-trail follower to un-capture it
  startEncounter: (monsterId: number) => void;
  startGoalEncounter: () => void;
  enterBattle: (wildMaxHp: number) => void;
  damageWild: (amount: number) => void;
  damageProtagonist: (amount: number) => void;
  healProtagonist: (amount: number) => void;
  concludeBattle: (outcome: BattleOutcome) => void;
  endEncounter: () => void;
  setTalkingSpeaker: (speaker: TalkingSpeaker) => void;
  setDevBattleShortcutsEnabled: (enabled: boolean) => void;
  setDevReleaseEnabled: (enabled: boolean) => void;
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
  devBattleShortcutsEnabled: false,
  devReleaseEnabled: false,
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
  setDevBattleShortcutsEnabled: (enabled) =>
    set({ devBattleShortcutsEnabled: enabled }),
  setDevReleaseEnabled: (enabled) => set({ devReleaseEnabled: enabled }),
}));
