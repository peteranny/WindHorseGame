import { useEffect, useState } from "react";
import { BATTLE_LOSS_COOLDOWN_MS } from "../../data/monsters/battleFormulas";
import { BattleOutcome } from "../../data/conversations/engine";

export type PendingOutcome = "win" | "lose" | "escape" | null;

// A beat before the loser starts sinking (once every in-flight throw/spit
// has actually landed), then the sink itself, then a further beat holding
// the sunk pose before the white/black fade begins covering it - all three
// must match .playerSink/.enemySink's own animation-delay/-duration in
// styles.css, since that's what actually plays the sink visually.
const SINK_LEAD_MS = 300;
const SINK_DURATION_MS = 500;
const SINK_HOLD_MS = 400;
// Must match outcome-fade-out-sink's opacity-0 percentage in styles.css -
// the fade only starts becoming visible once the whole sink sequence is
// done. Only win/loss actually wait through this pause (.outcomeFadeSinkTiming,
// OUTCOME_TOTAL_MS) - an escape has no sink to hold for, so it skips
// straight to just OUTCOME_FADE_MS of fade (.outcomeFadeQuickTiming)
// instead, see the pendingOutcome === "escape" check below.
const OUTCOME_PAUSE_MS = SINK_LEAD_MS + SINK_DURATION_MS + SINK_HOLD_MS;
const OUTCOME_FADE_MS = 700;
const OUTCOME_TOTAL_MS = OUTCOME_PAUSE_MS + OUTCOME_FADE_MS;

interface UseBattleOutcomeParams {
  activeMonsterId: number | null;
  isGoalEncounter: boolean;
  wildHp: number;
  protagonistHp: number;
  // Whether any throw/spit is still mid-flight - the sink/fade sequence
  // holds off until this goes false, so a slow throw never gets visually
  // cut off mid-flight by the losing sprite sinking or the screen fading
  // out under it. An escape has nothing to sink (isPlayerSinking/
  // isEnemySinking are both false for it), but still waits here the same
  // way before its own fade, for the same reason.
  hasInFlightAttacks: boolean;
  goalDefeatedAt: string | null;
  captureMonster: (monsterId: number) => void;
  setIsFirstGoalWin: (isFirst: boolean) => void;
  recordGoalWin: () => void;
  setBattleCooldown: (monsterId: string, until: number) => void;
  concludeBattle: (outcome: BattleOutcome) => void;
}

interface UseBattleOutcomeResult {
  pendingOutcome: PendingOutcome;
  setPendingOutcome: (outcome: PendingOutcome) => void;
  // Becomes true once the battle is decided AND every in-flight throw/spit
  // has actually landed - only then does the loser's sprite sink and the
  // white/black fade begin, so a still-flying attack never gets cut short.
  isSinking: boolean;
  isPlayerSinking: boolean;
  isEnemySinking: boolean;
}

// A win/loss pauses on the battlefield with a fade overlay before actually
// leaving - concludeBattle (which swaps this whole screen out) only fires
// once that fade has had time to play. An escape (Battle/index.tsx's 逃跑
// button) sets pendingOutcome directly rather than going through the
// decide-outcome effect below, but from here on out it's driven by the
// same isSinking machinery either way - just with a shorter fade and no
// sink pause, see the pendingOutcome === "escape" check further down.
export const useBattleOutcome = ({
  activeMonsterId,
  isGoalEncounter,
  wildHp,
  protagonistHp,
  hasInFlightAttacks,
  goalDefeatedAt,
  captureMonster,
  setIsFirstGoalWin,
  recordGoalWin,
  setBattleCooldown,
  concludeBattle,
}: UseBattleOutcomeParams): UseBattleOutcomeResult => {
  const [pendingOutcome, setPendingOutcome] = useState<PendingOutcome>(null);
  const [isSinking, setIsSinking] = useState(false);

  useEffect(() => {
    if (
      (activeMonsterId === null && !isGoalEncounter) ||
      pendingOutcome !== null
    )
      return;
    if (wildHp <= 0) {
      setPendingOutcome("win");
    } else if (protagonistHp <= 0) {
      setPendingOutcome("lose");
    }
  }, [activeMonsterId, isGoalEncounter, wildHp, protagonistHp, pendingOutcome]);

  useEffect(() => {
    if (pendingOutcome === null || isSinking || hasInFlightAttacks) return;
    setIsSinking(true);
  }, [pendingOutcome, isSinking, hasInFlightAttacks]);

  useEffect(() => {
    if (!isSinking || pendingOutcome === null) return;
    // Escape has no sink animation to hold for (see isPlayerSinking/
    // isEnemySinking below, both false for it) - skip straight to just the
    // fade portion instead of sitting through the same multi-beat pause a
    // real win/loss's sink sequence needs.
    const totalMs =
      pendingOutcome === "escape" ? OUTCOME_FADE_MS : OUTCOME_TOTAL_MS;
    const id = setTimeout(() => {
      // Only actually captured/recorded once the fade finishes and we're
      // leaving this screen - otherwise the defeated monster would show up
      // in the attack grid below while its own defeat is still playing out.
      if (pendingOutcome === "win") {
        if (activeMonsterId !== null) captureMonster(activeMonsterId);
        // The player only actually "enters" the house (their cell becoming
        // the goal's own, see Maze/houseState.ts) once the finale
        // conversation this outcome leads into has been read all the way
        // through - see ConversationView's own endEncounter call. Recorded
        // before recordGoalWin so it still reflects goalDefeatedAt's value
        // from *before* this win - recordGoalWin makes it non-null
        // immediately, so reading it any later would always say "not first".
        else if (isGoalEncounter) {
          setIsFirstGoalWin(goalDefeatedAt === null);
          recordGoalWin();
        }
      } else if (pendingOutcome === "lose" && !isGoalEncounter) {
        // Locks this same monster out of being re-challenged for a while -
        // ConversationView checks battleCooldowns before showing the normal
        // script again. The goal battle is deliberately exempt (it's tough
        // enough already - see its own loss hint below) - losing it still
        // shows buildGoalLossConversation's tip, just without also locking
        // the player out afterward.
        setBattleCooldown(String(activeMonsterId), Date.now() + BATTLE_LOSS_COOLDOWN_MS);
      }
      concludeBattle(pendingOutcome);
    }, totalMs);
    return () => clearTimeout(id);
    // goalDefeatedAt is deliberately not a dependency here - this effect
    // must only read whatever value it had at the render where isSinking
    // flipped true (i.e. from *before* this win), not re-run once
    // recordGoalWin (called synchronously right below) makes it non-null.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [
    isSinking,
    pendingOutcome,
    activeMonsterId,
    isGoalEncounter,
    captureMonster,
    setIsFirstGoalWin,
    recordGoalWin,
    setBattleCooldown,
    concludeBattle,
  ]);

  const isPlayerSinking = isSinking && pendingOutcome === "lose";
  const isEnemySinking = isSinking && pendingOutcome === "win";

  return {
    pendingOutcome,
    setPendingOutcome,
    isSinking,
    isPlayerSinking,
    isEnemySinking,
  };
};
