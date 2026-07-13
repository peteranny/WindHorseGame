import { create } from "zustand";
import { PROTAGONIST_MAX_HP } from "../data/monsters/battleFormulas";
import { BattleOutcome } from "../data/conversations/engine";

type Mode = "map" | "conversation" | "battle";

interface FlowState {
  mode: Mode;
  activeMonsterId: number | null;
  battleOutcome: BattleOutcome | null;
  wildHp: number;
  wildMaxHp: number;
  protagonistHp: number;
  startEncounter: (monsterId: number) => void;
  enterBattle: (wildMaxHp: number) => void;
  damageWild: (amount: number) => void;
  damageProtagonist: (amount: number) => void;
  healProtagonist: (amount: number) => void;
  concludeBattle: (outcome: BattleOutcome) => void;
  endEncounter: () => void;
}

export const useFlowStore = create<FlowState>((set) => ({
  mode: "map",
  activeMonsterId: null,
  battleOutcome: null,
  wildHp: 0,
  wildMaxHp: 0,
  protagonistHp: PROTAGONIST_MAX_HP,
  startEncounter: (monsterId) =>
    set({ mode: "conversation", activeMonsterId: monsterId }),
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
      protagonistHp: Math.min(
        PROTAGONIST_MAX_HP,
        state.protagonistHp + amount
      ),
    })),
  concludeBattle: (outcome) =>
    set({ mode: "conversation", battleOutcome: outcome }),
  endEncounter: () =>
    set({ mode: "map", activeMonsterId: null, battleOutcome: null }),
}));
