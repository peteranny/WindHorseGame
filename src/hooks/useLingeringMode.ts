import { useEffect, useRef, useState } from "react";
import { useFlowStore } from "../store/flowStore";
import { FREEZE_MS, FLASH_MS, DISTORT_IN_MS } from "../components/BattleTransition/timing";

// flowStore.mode flips from "conversation" to "battle" the instant a
// conversation's terminal "enter_challenge" page advances (ConversationView's
// advance(), which calls enterBattle()) - well before BattleTransition's own
// freeze/flash/cover-in sequence has actually finished obscuring the screen
// (the same coveredAt = FREEZE_MS + FLASH_MS + DISTORT_IN_MS delay
// BattleTransition itself waits before swapping its own displayed content -
// see its index.tsx). Dialog's ConversationView and Maze's own
// "isBeingTalkedTo" facing/bounce both read mode directly, so without this
// they'd vanish/reset in that same instant - the last line disappearing and
// the monster snapping back to its default facing while "freeze" is still
// fully visible (no overlay yet) - breaking the intended feel of the battle
// starting right on top of the conversation's last line. This hook holds
// "conversation" for that same delay on that one edge only, so both
// components keep rendering their conversation-active visuals until the
// screen is actually covered, then swap out invisibly like everything else
// already does.
export const useLingeringMode = (): string => {
  const mode = useFlowStore((state) => state.mode);
  const [lingeringMode, setLingeringMode] = useState(mode);
  const prevModeRef = useRef(mode);

  useEffect(() => {
    const prevMode = prevModeRef.current;
    prevModeRef.current = mode;
    if (prevMode !== "conversation" || mode !== "battle") {
      setLingeringMode(mode);
      return undefined;
    }
    const timer = setTimeout(
      () => setLingeringMode(mode),
      FREEZE_MS + FLASH_MS + DISTORT_IN_MS
    );
    return () => clearTimeout(timer);
  }, [mode]);

  return lingeringMode;
};
