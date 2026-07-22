import { useEffect, useState } from "react";
import MONSTERS from "../../data/monsters/monsters";
import { GOAL_NAME } from "../../data/goalEncounter";
import { REMAINING_OVERLAY_MS } from "../BattleTransition/timing";
import { TOAST_DURATION_MS } from "./useToastStack";

// The entrance sequence that plays once per fresh battle mount, as one
// strictly sequential chain through step 6 - each step below only starts
// once the previous one has entirely finished, never overlapping:
//   1. the enemy sprite + its own ground shadow slide in together
//   2. the player sprite slides in
//   3. a toast names the encounter ("遇到野生的X！", TOAST_DURATION_MS)
//   4. the enemy HP box reveals (drop-and-settle, like the attack cells)
//   5. the player HP box reveals, the same way
//   6. the action bar's actual content (escape/skip/dev buttons, the
//      attack grid) reveals AND a second toast ("開始！", also
//      TOAST_DURATION_MS) appears, together in the same instant - isEntering
//      flips false
//      right then too, so interaction unlocks exactly as "開始！" shows
//      up rather than only once that toast is done fading, and the cells
//      are already tappable while their own reveal animation
//      (.attackButtonReveal) is still playing over them
//
// This hook's own Battle instance only ever mounts right as
// BattleTransition's own black-screen hold begins (see its index.tsx - the
// distortion is fully, solidly opaque right then, and the map/battle
// content swap happens at that exact instant), so REMAINING_OVERLAY_MS -
// everything still left of the overlay at that point (the hold plus the
// final "reveal" clearing) - is step 1's own base delay, not just the last
// stage's own duration. Both sprites are a pure position slide (no fade -
// each sits at full opacity throughout, just translated off past the
// battlefield's own edge until its own delay elapses), so nothing here
// looks like it's fading in from behind the (by-then-gone) overlay.
export const ENTER_ENEMY_MS = 1050;
export const ENTER_PLAYER_MS = 1050;
// How long each HP block's own drop-and-settle reveal takes, once it
// starts - short and snappy, unrelated to how long a sprite itself took to
// slide in.
export const INFO_REVEAL_MS = 450;
// How long the action bar's own drop-and-settle reveal takes, once it
// starts - .attackButtonReveal's own animation duration.
export const ACTION_BAR_REVEAL_MS = 450;

export const ENEMY_ENTER_DELAY_MS = REMAINING_OVERLAY_MS;
export const PLAYER_ENTER_DELAY_MS = ENEMY_ENTER_DELAY_MS + ENTER_ENEMY_MS;
export const TOAST_ENCOUNTER_DELAY_MS = PLAYER_ENTER_DELAY_MS + ENTER_PLAYER_MS;
export const ENEMY_INFO_DELAY_MS =
  TOAST_ENCOUNTER_DELAY_MS + TOAST_DURATION_MS;
export const PLAYER_INFO_DELAY_MS = ENEMY_INFO_DELAY_MS + INFO_REVEAL_MS;
// The same instant the action bar's own reveal starts AND the "開始！"
// toast triggers - see isEntering/isActionBarRevealing/triggerToast below,
// all three fired together in one setTimeout, so interaction unlocks
// exactly as the toast appears rather than only once it's done showing.
export const ENTRANCE_LOCK_MS = PLAYER_INFO_DELAY_MS + INFO_REVEAL_MS;

interface UseEntranceSequenceParams {
  isGoalEncounter: boolean;
  activeMonsterId: number | null;
  triggerToast: (text: string) => void;
}

interface UseEntranceSequenceResult {
  // True for exactly ENTRANCE_LOCK_MS starting from Battle's own mount (a
  // fresh Battle instance mounts every time a new battle starts, see
  // BattleTransition's own `displayed` swap) - drives steps 1-5 of the
  // entrance sequence above, and locks the action bar (.actionBarLocked)
  // until step 6 begins.
  isEntering: boolean;
  // Flips true for exactly ACTION_BAR_REVEAL_MS the instant isEntering
  // flips false - just long enough to play .attackGridReveal's one-shot
  // drop-and-settle bounce, then clears itself so a later re-render (a
  // cooldown tick, an attack) doesn't replay it.
  isActionBarRevealing: boolean;
}

export const useEntranceSequence = ({
  isGoalEncounter,
  activeMonsterId,
  triggerToast,
}: UseEntranceSequenceParams): UseEntranceSequenceResult => {
  const [isEntering, setIsEntering] = useState(true);
  const [isActionBarRevealing, setIsActionBarRevealing] = useState(false);

  useEffect(() => {
    let revealTimeoutId: ReturnType<typeof setTimeout> | undefined;
    // Step 6 - the action bar unlocks and "開始！" appears in the exact
    // same instant, rather than the toast trailing behind an already-
    // interactive battle.
    const lockTimeoutId = setTimeout(() => {
      setIsEntering(false);
      setIsActionBarRevealing(true);
      triggerToast("開始！");
      revealTimeoutId = setTimeout(
        () => setIsActionBarRevealing(false),
        ACTION_BAR_REVEAL_MS
      );
    }, ENTRANCE_LOCK_MS);
    // Step 3 - both toasts just append to the shared stack (see
    // useToastStack), so either one overlapping with a later family-bonus/
    // heal toast (e.g. the player attacks the instant step 6 unlocks the
    // action bar and shows "開始！") stacks rather than clobbering it.
    const encounterName = isGoalEncounter
      ? GOAL_NAME
      : activeMonsterId !== null
      ? MONSTERS[activeMonsterId].name
      : "";
    const encounterToastTimeoutId = setTimeout(() => {
      triggerToast(`遇到野生的${encounterName}！`);
    }, TOAST_ENCOUNTER_DELAY_MS);
    return () => {
      clearTimeout(lockTimeoutId);
      if (revealTimeoutId) clearTimeout(revealTimeoutId);
      clearTimeout(encounterToastTimeoutId);
    };
    // isGoalEncounter/activeMonsterId never change within one Battle mount
    // (a fresh instance mounts per battle) - included for correctness, not
    // because this effect is expected to ever actually rerun.
  }, [isGoalEncounter, activeMonsterId, triggerToast]);

  return { isEntering, isActionBarRevealing };
};
