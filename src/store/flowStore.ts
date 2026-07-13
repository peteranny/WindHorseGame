import { create } from "zustand";

type Mode = "map" | "conversation" | "battle";

interface FlowState {
  mode: Mode;
  activeMonsterId: number | null;
  startEncounter: (monsterId: number) => void;
  enterBattle: () => void;
  endEncounter: () => void;
}

export const useFlowStore = create<FlowState>((set) => ({
  mode: "map",
  activeMonsterId: null,
  startEncounter: (monsterId) =>
    set({ mode: "conversation", activeMonsterId: monsterId }),
  enterBattle: () => set({ mode: "battle" }),
  endEncounter: () => set({ mode: "map", activeMonsterId: null }),
}));
