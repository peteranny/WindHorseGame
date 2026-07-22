import { RefObject, useEffect, useReducer, useRef } from "react";
import {
  GOAL_SELF_HEAL_INTERVAL_SPITS,
  GOAL_SELF_HEAL_PERCENT,
  WILD_ATTACK_DAMAGE,
  WILD_ATTACK_INTERVAL_MS,
} from "../../data/monsters/battleFormulas";
import { GOAL_NAME } from "../../data/goalEncounter";
import { Point } from "./geometry";
import {
  EFFECT_DURATION_MS,
  attackBumpKeyframes,
  hitBumpKeyframes,
  playBump,
} from "./spriteEffects";
import { SPIT_DURATION_MS } from "./useSpitEffect";
import { ENTRANCE_LOCK_MS } from "./useEntranceSequence";
import { HEAL_ANIMATION_MS } from "./useHealEffect";
import { PendingOutcome } from "./useBattleOutcome";

// Drives forceTick() below, which forces a full re-render of the whole
// Battle component (re-grouping the attack line, re-rendering every attack
// button) for as long as any battle lasts - kept as coarse as the
// telegraph/cooldown displays can tolerate (see their own comments) rather
// than tighter, since this runs continuously through every single battle.
const TICK_MS = 1000;
const WILD_ATTACK_TELEGRAPH_MS = 2000;
// The 3 telegraph marks' own reveal delays, evenly spaced across the
// telegraph window - driven entirely by CSS animation-delay (see
// .telegraphMark) rather than by counting up on forceTick's 1s cadence,
// since that cadence is coarser than this 2s window can show 3 distinct
// steps through: only 2 of its renders ever land inside the window (the
// render at the window's true end coincides with the attack already having
// fired), so a tick-driven count could only ever reach 1, then 2, then
// straight to the spit - never showing all 3 as the "imminent" cue the
// marks are meant to be.
export const TELEGRAPH_MARK_DELAYS_MS = [0, 1, 2].map(
  (i) => (i * WILD_ATTACK_TELEGRAPH_MS) / 3
);
// The goal battle's own coldnoodle self-heal (see wildSpitCountRef below) -
// the noodle isn't thrown across the battlefield like a captured monster's
// icon; it shifts in and fades in beside the enemy sprite like a side dish,
// wiggles in place, then fades back out without moving. The glow+heal below
// (triggerEnemyHeal/healWild) fires once the wiggle's done, right as the
// noodle starts fading out.
const COLD_NOODLE_ENTER_MS = 300;
const COLD_NOODLE_WIGGLE_MS = 2000;
const COLD_NOODLE_EXIT_MS = 300;
const COLD_NOODLE_TOTAL_MS =
  COLD_NOODLE_ENTER_MS + COLD_NOODLE_WIGGLE_MS + COLD_NOODLE_EXIT_MS;
const COLD_NOODLE_HEAL_DELAY_MS = COLD_NOODLE_ENTER_MS + COLD_NOODLE_WIGGLE_MS;

interface UseWildAttackClockParams {
  pendingOutcome: PendingOutcome;
  isEntering: boolean;
  isGoalEncounter: boolean;
  wildMaxHp: number;
  enemySpriteRef: RefObject<HTMLElement>;
  enemyShadowRef: RefObject<HTMLElement>;
  playerSpriteRef: RefObject<HTMLElement>;
  getTrajectory: (
    target?: "toEnemy" | "toPlayer" | "selfPlayer"
  ) => { from: Point; to: Point; angleDeg: number } | null;
  damageProtagonist: (amount: number) => void;
  triggerEnemySpit: (from: Point, to: Point, angleDeg: number) => void;
  triggerColdNoodle: (effect: "heal" | null, durationMs?: number) => void;
  triggerToast: (text: string) => void;
  triggerEnemyHeal: (effect: "heal" | null, durationMs?: number) => void;
  healWild: (amount: number) => void;
}

// Goal-battle-only boss mechanic: counts every spit the wild side has
// thrown at the player so far this battle - every GOAL_SELF_HEAL_INTERVAL_SPITS-th
// one, a coldnoodle appears beside it as a self-heal instead of just
// spitting again.
export const useWildAttackClock = ({
  pendingOutcome,
  isEntering,
  isGoalEncounter,
  wildMaxHp,
  enemySpriteRef,
  enemyShadowRef,
  playerSpriteRef,
  getTrajectory,
  damageProtagonist,
  triggerEnemySpit,
  triggerColdNoodle,
  triggerToast,
  triggerEnemyHeal,
  healWild,
}: UseWildAttackClockParams): { isWildTelegraphing: boolean } => {
  const [, forceTick] = useReducer((n: number) => n + 1, 0);
  // Delayed past ENTRANCE_LOCK_MS (rather than starting to count down from
  // the instant Battle mounts) so the wild monster's own attack clock
  // doesn't start running before the player can actually do anything back -
  // the first attack lands WILD_ATTACK_INTERVAL_MS after the entrance
  // sequence (and thus the action bar) actually unlocks, same as every
  // attack after it.
  const nextWildAttackAtRef = useRef(
    Date.now() + ENTRANCE_LOCK_MS + WILD_ATTACK_INTERVAL_MS
  );
  const wildSpitCountRef = useRef(0);

  useEffect(() => {
    const id = setInterval(() => {
      if (
        pendingOutcome === null &&
        !isEntering &&
        Date.now() >= nextWildAttackAtRef.current
      ) {
        // Mirrors the innate attack: the enemy spits at the player, and the
        // hit only lands once that spit actually arrives.
        playBump(enemySpriteRef.current, attackBumpKeyframes(-20), EFFECT_DURATION_MS);
        playBump(enemyShadowRef.current, attackBumpKeyframes(-20), EFFECT_DURATION_MS);
        const trajectory = getTrajectory("toPlayer");
        if (trajectory) {
          triggerEnemySpit(trajectory.from, trajectory.to, trajectory.angleDeg);
        }
        setTimeout(() => {
          damageProtagonist(WILD_ATTACK_DAMAGE);
          playBump(playerSpriteRef.current, hitBumpKeyframes(-20), EFFECT_DURATION_MS);
        }, SPIT_DURATION_MS);

        wildSpitCountRef.current += 1;
        if (
          isGoalEncounter &&
          wildSpitCountRef.current % GOAL_SELF_HEAL_INTERVAL_SPITS === 0
        ) {
          // Queued right after the regular spit lands, so the two never
          // visually overlap - the coldnoodle shifts/fades in beside the
          // enemy and wiggles (triggerColdNoodle, see COLD_NOODLE_TOTAL_MS
          // above), then the same build/hold/release glow captured
          // monsters' own heals use starts right as the wiggle ends, and
          // only once that glow finishes does the HP actually recover.
          setTimeout(() => {
            triggerColdNoodle("heal", COLD_NOODLE_TOTAL_MS);
            triggerToast(`${GOAL_NAME}吃了涼麵，恢復了體力！`);
            setTimeout(() => {
              triggerEnemyHeal("heal", HEAL_ANIMATION_MS);
              setTimeout(() => {
                healWild(wildMaxHp * GOAL_SELF_HEAL_PERCENT);
              }, HEAL_ANIMATION_MS);
            }, COLD_NOODLE_HEAL_DELAY_MS);
          }, SPIT_DURATION_MS);
        }

        nextWildAttackAtRef.current += WILD_ATTACK_INTERVAL_MS;
      }
      forceTick();
    }, TICK_MS);
    return () => clearInterval(id);
  }, [
    pendingOutcome,
    isEntering,
    getTrajectory,
    damageProtagonist,
    triggerEnemySpit,
    isGoalEncounter,
    triggerColdNoodle,
    triggerToast,
    triggerEnemyHeal,
    healWild,
    wildMaxHp,
  ]);

  const msUntilWildAttack = nextWildAttackAtRef.current - Date.now();
  const isWildTelegraphing =
    msUntilWildAttack > 0 && msUntilWildAttack <= WILD_ATTACK_TELEGRAPH_MS;

  return { isWildTelegraphing };
};
