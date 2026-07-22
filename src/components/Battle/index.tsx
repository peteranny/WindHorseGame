import React, {
  useCallback,
  useEffect,
  useReducer,
  useRef,
  useState,
} from "react";
import cn from "classnames";
import styles from "./styles.css";
import { useFlowStore } from "../../store/flowStore";
import { useGameStore } from "../../store/gameStore";
import { isDevStateKey } from "../../store/devMode";
import MONSTERS from "../../data/monsters/monsters";
import {
  ATTACK_COOLDOWN_MS,
  ATTACK_DAMAGE,
  BATTLE_LOSS_COOLDOWN_MS,
  GOAL_SELF_HEAL_INTERVAL_SPITS,
  GOAL_SELF_HEAL_PERCENT,
  PROTAGONIST_MAX_HP,
  WILD_ATTACK_DAMAGE,
  WILD_ATTACK_INTERVAL_MS,
} from "../../data/monsters/battleFormulas";
import {
  findGroupContaining,
  groupByAdjacentFamily,
  groupMultiplierAt,
  hueForFamily,
  moveGroupToBack,
  moveGroupToFront,
} from "./attackGroups";
import { GOAL_NAME } from "../../data/goalEncounter";
import { REMAINING_OVERLAY_MS } from "../BattleTransition/timing";
import PLAYER_SPRITE from "../../assets/playerSprite.png";
import GOAL_SPRITE from "../../assets/goalSprite.png";
import COLD_NOODLE_SPRITE from "../../assets/coldNoodle.png";
import ROAD_TILE from "../../assets/roadTile.jpg";

// Every distinct attack family that actually exists, in a stable
// (alphabetical) order - hueForFamily spaces hues evenly across this list
// so any two families are always maximally, visibly distinct, rather than
// relying on a hash that could put two unrelated families' colors close
// together by chance.
const ALL_FAMILIES = Array.from(
  new Set(MONSTERS.map((monster) => monster.attackFamily))
).sort();

const INNATE_KEY = "innate";
const LEAVE_DURATION_MS = 250;
const ENTER_DURATION_MS = 250;
// Backstop for the scroll-compensation rAF loops further down (leaveStep/
// step) - they stop once the measured width itself actually converges, not
// on a fixed duration (see their own comments for why), but this guards
// against looping forever if a width somehow never settles.
const SCROLL_COMPENSATION_SAFETY_MS = 1000;
// Gap between each thrown member's own launch when a whole family group is
// thrown together, so the group's throws read as a distinguishable volley
// rather than one indistinct simultaneous blob.
const GROUP_THROW_STAGGER_MS = 300;
// A heal's own glow builds, holds, and releases over this much longer span
// (rather than EFFECT_DURATION_MS's quick attack/hit flash) - the protagonist's
// HP only actually recovers once this whole animation finishes.
const HEAL_ANIMATION_MS = 3000;
// Drives forceTick() below, which forces a full re-render of this whole
// component (re-grouping the attack line, re-rendering every attack
// button) for as long as any battle lasts - kept as coarse as the
// telegraph/cooldown displays can tolerate (see their own comments) rather
// than tighter, since this runs continuously through every single battle.
const TICK_MS = 1000;
const EFFECT_DURATION_MS = 300;
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
const TELEGRAPH_MARK_DELAYS_MS = [0, 1, 2].map(
  (i) => (i * WILD_ATTACK_TELEGRAPH_MS) / 3
);
const THROW_DURATION_MS = 2000;
const SPIT_DURATION_MS = 500;
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
// A beat before the loser starts sinking (once every in-flight throw/spit
// has actually landed), then the sink itself, then a further beat holding
// the sunk pose before the white/black fade begins covering it - all three
// must match .playerSink/.enemySink's own animation-delay/-duration in
// styles.css, since that's what actually plays the sink visually.
const SINK_LEAD_MS = 300;
const SINK_DURATION_MS = 500;
const SINK_HOLD_MS = 400;
// Must match outcome-fade-out's opacity-0 percentage in styles.css - the
// fade only starts becoming visible once the whole sink sequence is done.
const OUTCOME_PAUSE_MS = SINK_LEAD_MS + SINK_DURATION_MS + SINK_HOLD_MS;
const OUTCOME_FADE_MS = 700;
const OUTCOME_TOTAL_MS = OUTCOME_PAUSE_MS + OUTCOME_FADE_MS;

// The entrance sequence that plays once per fresh battle mount, as one
// strictly sequential chain - each step below only starts once the
// previous one has entirely finished, never overlapping:
//   1. the enemy sprite + its own ground shadow slide in together
//   2. the player sprite slides in
//   3. a toast names the encounter ("遇到野生的X！", TOAST_MS)
//   4. the enemy HP box reveals (drop-and-settle, like the attack cells)
//   5. the player HP box reveals, the same way
//   6. the action bar's actual content (escape/skip/dev buttons, the
//      attack grid) reveals - isEntering flips false at this exact
//      instant, so the cells are already tappable while their own reveal
//      animation (.attackButtonReveal) is still playing over them
//   7. a second toast ("開始戰鬥！", also TOAST_MS - both toasts share the
//      one length) plays on top of the now-already-interactive battle,
//      purely cosmetic
//
// This component only ever mounts right as BattleTransition's own
// black-screen hold begins (see its index.tsx - the distortion is fully,
// solidly opaque right then, and the map/battle content swap happens at
// that exact instant), so REMAINING_OVERLAY_MS - everything still left of
// the overlay at that point (the hold plus the final "reveal" clearing) -
// is step 1's own base delay, not just the last stage's own duration.
// Both sprites are a pure position slide (no fade - each sits at full
// opacity throughout, just translated off past the battlefield's own edge
// until its own delay elapses), so nothing here looks like it's fading in
// from behind the (by-then-gone) overlay.
const ENTER_ENEMY_MS = 1050;
const ENTER_PLAYER_MS = 1050;
// Both toasts (step 3's "遇到野生的X！" and step 7's "開始戰鬥！") share this
// one length - unified rather than each having its own, so a toast always
// reads the same regardless of which one is showing.
// Its fade fraction is fixed by .toast's own shared keyframe (styles.css),
// not derived from a separate fade/hold breakdown here.
const TOAST_MS = 2000;
// How long each HP block's own drop-and-settle reveal takes, once it
// starts - short and snappy, unrelated to how long a sprite itself took to
// slide in.
const INFO_REVEAL_MS = 450;
// How long the action bar's own drop-and-settle reveal takes, once it
// starts - .attackButtonReveal's own animation duration.
const ACTION_BAR_REVEAL_MS = 450;

const ENEMY_ENTER_DELAY_MS = REMAINING_OVERLAY_MS;
const PLAYER_ENTER_DELAY_MS = ENEMY_ENTER_DELAY_MS + ENTER_ENEMY_MS;
const TOAST_ENCOUNTER_DELAY_MS = PLAYER_ENTER_DELAY_MS + ENTER_PLAYER_MS;
const ENEMY_INFO_DELAY_MS = TOAST_ENCOUNTER_DELAY_MS + TOAST_MS;
const PLAYER_INFO_DELAY_MS = ENEMY_INFO_DELAY_MS + INFO_REVEAL_MS;
// The same instant the action bar's own reveal starts - see isEntering/
// isActionBarRevealing below, both flipped together in one setTimeout.
const ENTRANCE_LOCK_MS = PLAYER_INFO_DELAY_MS + INFO_REVEAL_MS;
const TOAST_START_DELAY_MS = ENTRANCE_LOCK_MS + ACTION_BAR_REVEAL_MS;

// "heal" is the only sprite effect still driven by React state/CSS class -
// see useHealEffect and playBump below for why attack/hit moved off this.
type HealEffect = "heal" | null;
type PendingOutcome = "win" | "lose" | null;

interface AttackOption {
  key: string;
  label: string;
  icon: string;
  isHealer: boolean;
  healAmount: number;
  // The battle-adjacency family/step (see data/monsters/attackFamily.ts) -
  // null family for the innate attack, which never groups with a neighbor.
  family: string | null;
  step: number;
}

// A point expressed as a percentage of .battlefield's own box, so throw/spit
// trajectories stay correct no matter the viewport size or how the sprites
// themselves are positioned/anchored within it.
interface Point {
  xPercent: number;
  yPercent: number;
}

interface ThrowEffect {
  id: number;
  icon: string;
  from: Point;
  to: Point;
  // A healer's own self-toss (selfPlayer - identical from/to, see
  // getTrajectory) still arcs up and down in place, but shouldn't also
  // shrink like a real cross-battlefield throw does - that shrink reads as
  // "flying into the distance", which never happens here.
  selfToss: boolean;
}

interface SpitEffect {
  id: number;
  from: Point;
  to: Point;
  angleDeg: number;
}

const rectCenter = (rect: DOMRect): { x: number; y: number } => ({
  x: rect.left + rect.width / 2,
  y: rect.top + rect.height / 2,
});

// `point`'s position as a percentage of `containerRect`'s box - measured
// live rather than hardcoded, so it's always right regardless of how
// either element is currently positioned/sized.
const percentIn = (
  point: { x: number; y: number },
  containerRect: DOMRect
): Point => ({
  xPercent: ((point.x - containerRect.left) / containerRect.width) * 100,
  yPercent: ((point.y - containerRect.top) / containerRect.height) * 100,
});

// The clockwise rotation (in degrees) that makes the spit glyph's rounded,
// naturally-downward-facing end (see .spitDrop's base rotate(-90deg), its
// own facing at --angle: 0deg) point from `from` toward `to`. Computed from
// real pixel centers rather than the from/to percentages, since those are
// relative to .battlefield's box and would skew the angle whenever it isn't
// perfectly square.
const angleBetween = (
  from: { x: number; y: number },
  to: { x: number; y: number }
): number => (Math.atan2(to.y - from.y, to.x - from.x) * 180) / Math.PI - 90;

const pointStyle = (from: Point, to: Point): React.CSSProperties =>
  ({
    "--start-x": `${from.xPercent}%`,
    "--start-y": `${from.yPercent}%`,
    "--end-x": `${to.xPercent}%`,
    "--end-y": `${to.yPercent}%`,
  } as React.CSSProperties);

const spitStyle = (effect: SpitEffect): React.CSSProperties =>
  ({
    ...pointStyle(effect.from, effect.to),
    "--angle": `${effect.angleDeg}deg`,
  } as React.CSSProperties);

const HpBar = ({ hp, maxHp }: { hp: number; maxHp: number }) => (
  <div className={styles.hpBarOuter}>
    <div
      className={styles.hpBarInner}
      style={{ width: `${maxHp > 0 ? (hp / maxHp) * 100 : 0}%` }}
    />
  </div>
);

const useHealEffect = (): [
  HealEffect,
  (effect: HealEffect, durationMs?: number) => void
] => {
  const [effect, setEffect] = useState<HealEffect>(null);
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const trigger = useCallback(
    (next: HealEffect, durationMs: number = EFFECT_DURATION_MS) => {
      setEffect(next);
      if (timeoutRef.current) clearTimeout(timeoutRef.current);
      timeoutRef.current = setTimeout(() => setEffect(null), durationMs);
    },
    []
  );
  return [effect, trigger];
};

// The player's own filter-based heal glow (useHealEffect above) is the only
// sprite effect still driven by React state/className - a quick attack/hit
// bump instead plays via the Web Animations API, fired directly on the
// sprite's DOM node. That keeps it independent of (and unable to cut short)
// a concurrent heal glow: `animation`'s CSS shorthand can only ever resolve
// to one value per element, so two className-driven animations fight over
// the same slot and only the most recent wins - but a WAAPI animation and a
// CSS-class animation are separate mechanisms entirely, and here they also
// animate different properties (transform vs filter), so they can run at
// the same time with no conflict at all.
const attackBumpKeyframes = (directionPx: number): Keyframe[] => [
  { transform: "translateX(0)" },
  { transform: `translateX(calc(${directionPx}px * var(--scale)))`, offset: 0.3 },
  { transform: "translateX(0)" },
];

const hitBumpKeyframes = (rotateDeg: number): Keyframe[] => [
  { transform: "translateY(0) rotate(0deg)" },
  {
    transform: `translateY(calc(12px * var(--scale))) rotate(${rotateDeg}deg)`,
    offset: 0.4,
  },
  { transform: "translateY(0) rotate(0deg)" },
];

const playBump = (
  el: HTMLElement | null,
  keyframes: Keyframe[],
  durationMs: number
): void => {
  el?.animate(keyframes, { duration: durationMs, easing: "ease" });
};

// Every captured monster currently mid-throw at the wild monster (the
// innate fist attack has nothing to throw, so it never uses this). Each
// throw gets its own id, removed only by its own onAnimationEnd (see
// .thrownIcon's render below) rather than a separately-tracked setTimeout -
// a parallel JS timer has to be kept exactly in sync with the CSS
// animation's own duration by convention, and any drift between the two
// (rendering jank, batched updates) leaves a landed, no-longer-animating
// icon frozen on screen (animation-fill-mode: forwards holds its last
// frame) until the timer eventually catches up. Tying removal directly to
// the browser's own animationend event can't drift, so throwing a second
// monster before the first one lands still doesn't cut the first one's
// animation short - they each run to completion and self-remove independently.
//
// onAnimationEnd can still silently fail to fire at all in rare cases (a
// backgrounded/throttled tab pausing the CSS animation, a dropped event) -
// and because effects is an array rather than a single nullable slot, a
// throw that fails to clear this way doesn't just get replaced by the next
// one the way a single-slot effect would - it's a genuine leak, sitting in
// the array forever while later throws keep appending around it. trigger
// arms a generous safety-net timeout well past the animation's own real
// duration to guarantee eventual cleanup either way; clear(id) is already
// idempotent (filters by id), so calling it again after onAnimationEnd
// already did is a harmless no-op.
const THROW_SAFETY_NET_MS = THROW_DURATION_MS + 1000;
const useThrowEffect = (): [
  ThrowEffect[],
  (icon: string, from: Point, to: Point, selfToss?: boolean) => void,
  (id: number) => void
] => {
  const [effects, setEffects] = useState<ThrowEffect[]>([]);
  const nextIdRef = useRef(0);
  const clear = useCallback((id: number) => {
    setEffects((current) => current.filter((effect) => effect.id !== id));
  }, []);
  const trigger = useCallback(
    (icon: string, from: Point, to: Point, selfToss: boolean = false) => {
      nextIdRef.current += 1;
      const id = nextIdRef.current;
      setEffects((current) => [...current, { id, icon, from, to, selfToss }]);
      setTimeout(() => clear(id), THROW_SAFETY_NET_MS);
    },
    [clear]
  );
  return [effects, trigger, clear];
};

// The innate attack's water-drop spit, shot straight from the player to the
// wild monster. Same onAnimationEnd-driven cleanup as useThrowEffect above,
// for the same reason - no separate timer that could drift out of sync with
// the CSS animation it's meant to track. That primary path can still fail to
// fire at all in rare cases (a backgrounded/throttled tab pausing the CSS
// animation, a dropped animationend event) - since that leaves the spit
// stuck on screen indefinitely with nothing left to clear it, trigger also
// arms a generous safety-net timeout well past the animation's own real
// duration, so it never fires under normal conditions (onAnimationEnd
// already will have) and never fights the primary path - it only ever
// rescues a spit onAnimationEnd already failed to clear on its own. Guarded
// by id so a stale timeout from an earlier spit can't clear a newer one.
//
// Instantiated twice below (once for the player's own spit, once for the
// wild monster's) - each keeps its own independent id counter starting at 1,
// so the two can (and regularly do, since the wild monster auto-attacks on
// its own timer) land on the same id at the same time. Both spans are still
// siblings under the same .battlefield parent though, so a bare key={id}
// on each was a real collision, not just a coincidence - React reconciles
// keys across a fiber's whole child list, not per JSX call site. That let
// the two spits get their DOM nodes/onAnimationEnd handlers crossed, which
// is what was actually causing a spit to occasionally never disappear - the
// render-site keys are namespaced (`player-spit-`/`enemy-spit-`) to rule
// this out for good, on top of the safety-net timeout above.
const SPIT_SAFETY_NET_MS = SPIT_DURATION_MS + 1000;
const useSpitEffect = (): [
  SpitEffect | null,
  (from: Point, to: Point, angleDeg: number) => void,
  () => void
] => {
  const [effect, setEffect] = useState<SpitEffect | null>(null);
  const nextIdRef = useRef(0);
  const trigger = useCallback((from: Point, to: Point, angleDeg: number) => {
    nextIdRef.current += 1;
    const id = nextIdRef.current;
    setEffect({ id, from, to, angleDeg });
    setTimeout(() => {
      setEffect((current) => (current?.id === id ? null : current));
    }, SPIT_SAFETY_NET_MS);
  }, []);
  const clear = useCallback(() => setEffect(null), []);
  return [effect, trigger, clear];
};

interface ToastEntry {
  id: number;
  text: string;
  durationMs: number;
}

// The battlefield's callout stack - "X 系列加成，效果卓越" for a real family
// group throw, a healing-specific message whenever a healer (solo or
// grouped) is tapped, and the two entrance banners ("遇到野生的X！",
// "開始戰鬥！"). Every trigger appends its own entry rather than replacing
// whatever's currently showing (the single-slot version this used to be
// let a second trigger silently cut the first one's banner short) - each
// entry then removes only itself, by id, once its own durationMs elapses,
// same reasoning as useThrowEffect's per-id cleanup. Battle/styles.css's
// .toastStack renders whatever's still in this array as a vertically
// stacked column (with a gap), so two toasts that happen to overlap in
// time - e.g. attacking the instant the action bar unlocks, right as
// "開始戰鬥！" is still fading - both stay fully visible side by side
// rather than one clobbering the other.
const useToastStack = (): [
  ToastEntry[],
  (text: string, durationMs: number) => void
] => {
  const [toasts, setToasts] = useState<ToastEntry[]>([]);
  const nextIdRef = useRef(0);
  const trigger = useCallback((text: string, durationMs: number) => {
    nextIdRef.current += 1;
    const id = nextIdRef.current;
    setToasts((current) => [...current, { id, text, durationMs }]);
    setTimeout(() => {
      setToasts((current) => current.filter((toast) => toast.id !== id));
    }, durationMs);
  }, []);
  return [toasts, trigger];
};

const Battle = () => {
  const activeMonsterId = useFlowStore((state) => state.activeMonsterId);
  const isGoalEncounter = useFlowStore((state) => state.isGoalEncounter);
  const wildHp = useFlowStore((state) => state.wildHp);
  const wildMaxHp = useFlowStore((state) => state.wildMaxHp);
  const protagonistHp = useFlowStore((state) => state.protagonistHp);
  const damageWild = useFlowStore((state) => state.damageWild);
  const healWild = useFlowStore((state) => state.healWild);
  const damageProtagonist = useFlowStore((state) => state.damageProtagonist);
  const healProtagonist = useFlowStore((state) => state.healProtagonist);
  const concludeBattle = useFlowStore((state) => state.concludeBattle);
  const setIsFirstGoalWin = useFlowStore((state) => state.setIsFirstGoalWin);

  const stateKey = useGameStore((state) => state.stateKey);
  const isDevMode = isDevStateKey(stateKey);
  const monsterOrder = useGameStore((state) => state.monsterOrder);
  const reorderMonsters = useGameStore((state) => state.reorderMonsters);
  const cooldowns = useGameStore((state) => state.cooldowns);
  const setCooldown = useGameStore((state) => state.setCooldown);
  const setBattleCooldown = useGameStore((state) => state.setBattleCooldown);
  const captureMonster = useGameStore((state) => state.captureMonster);
  const goalDefeatedAt = useGameStore((state) => state.goalDefeatedAt);
  const recordGoalWin = useGameStore((state) => state.recordGoalWin);

  const [playerHealEffect, triggerPlayerHeal] = useHealEffect();
  const [enemyHealEffect, triggerEnemyHeal] = useHealEffect();
  // The goal battle's own coldnoodle self-heal side dish (see
  // COLD_NOODLE_TOTAL_MS above) - reuses this same generic "on/off with a
  // timeout" hook rather than a bespoke one, same as the two heal glows.
  const [coldNoodleEffect, triggerColdNoodle] = useHealEffect();
  const [throwEffects, triggerThrow, clearThrow] = useThrowEffect();
  const [spitEffect, triggerSpit, clearSpit] = useSpitEffect();
  const [enemySpitEffect, triggerEnemySpit, clearEnemySpit] = useSpitEffect();
  const [toasts, triggerToast] = useToastStack();
  const [pendingOutcome, setPendingOutcome] = useState<PendingOutcome>(null);
  // Becomes true once the battle is decided AND every in-flight throw/spit
  // has actually landed - only then does the loser's sprite sink and the
  // white/black fade begin, so a still-flying attack never gets cut short.
  const [isSinking, setIsSinking] = useState(false);

  // True for exactly ENTRANCE_LOCK_MS starting from this component's own
  // mount (a fresh Battle instance mounts every time a new battle starts,
  // see BattleTransition's own `displayed` swap) - drives steps 1-5 of the
  // entrance sequence above, and locks the action bar (.actionBarLocked)
  // until step 6 begins.
  const [isEntering, setIsEntering] = useState(true);
  // Flips true for exactly ACTION_BAR_REVEAL_MS the instant isEntering
  // flips false - just long enough to play .actionBarReveal's one-shot
  // drop-and-settle shake, then clears itself so a later re-render (a
  // cooldown tick, an attack) doesn't replay it.
  const [isActionBarRevealing, setIsActionBarRevealing] = useState(false);
  useEffect(() => {
    let revealTimeoutId: ReturnType<typeof setTimeout> | undefined;
    const lockTimeoutId = setTimeout(() => {
      setIsEntering(false);
      setIsActionBarRevealing(true);
      revealTimeoutId = setTimeout(
        () => setIsActionBarRevealing(false),
        ACTION_BAR_REVEAL_MS
      );
    }, ENTRANCE_LOCK_MS);
    // Step 3 - both toasts just append to the shared stack (see
    // useToastStack above) like any other trigger call, so either one
    // overlapping with a later family-bonus/heal toast (e.g. the player
    // attacks the instant step 6 unlocks the action bar, right as step 7's
    // "開始戰鬥！" is still fading) stacks rather than clobbering it.
    const encounterName = isGoalEncounter
      ? GOAL_NAME
      : activeMonsterId !== null
      ? MONSTERS[activeMonsterId].name
      : "";
    const encounterToastTimeoutId = setTimeout(() => {
      triggerToast(`遇到野生的${encounterName}！`, TOAST_MS);
    }, TOAST_ENCOUNTER_DELAY_MS);
    // Step 7 - unlike steps 1-6, this plays entirely *after* isEntering has
    // already flipped false (the battle is already interactive throughout).
    const startToastTimeoutId = setTimeout(() => {
      triggerToast("開始戰鬥！", TOAST_MS);
    }, TOAST_START_DELAY_MS);
    return () => {
      clearTimeout(lockTimeoutId);
      if (revealTimeoutId) clearTimeout(revealTimeoutId);
      clearTimeout(encounterToastTimeoutId);
      clearTimeout(startToastTimeoutId);
    };
    // isGoalEncounter/activeMonsterId never change within one Battle mount
    // (a fresh instance mounts per battle) - included for correctness, not
    // because this effect is expected to ever actually rerun.
  }, [isGoalEncounter, activeMonsterId, triggerToast]);

  const battlefieldRef = useRef<HTMLDivElement>(null);
  const playerSpriteRef = useRef<HTMLImageElement>(null);
  const enemySpriteRef = useRef<HTMLImageElement>(null);
  // A ground shadow for the enemy, like the map's own .footShadow - bumped
  // in lockstep with the sprite (see the attack-bump call below) so it
  // stays under the sprite's feet during its horizontal lunge instead of
  // sitting fixed while the sprite visibly shifts away from it. Not bumped
  // during the vertical hit-knockback (hitBumpKeyframes has no horizontal
  // component to follow, so there's nothing for the shadow to mirror there).
  const enemyShadowRef = useRef<HTMLDivElement>(null);
  // Measured live off the actual rendered sprites rather than hardcoded, so
  // the throw/spit trajectories stay pinned to their true centers - and the
  // spit's rotation to their true angle - no matter how either sprite ends
  // up positioned/sized.
  const getTrajectory = useCallback((
    target: "toEnemy" | "toPlayer" | "selfPlayer" = "toEnemy"
  ): {
    from: Point;
    to: Point;
    angleDeg: number;
  } | null => {
    const battlefield = battlefieldRef.current;
    const playerSprite = playerSpriteRef.current;
    const enemySprite = enemySpriteRef.current;
    if (!battlefield || !playerSprite || !enemySprite) return null;
    const battlefieldRect = battlefield.getBoundingClientRect();
    const playerCenter = rectCenter(playerSprite.getBoundingClientRect());
    const enemyCenter = rectCenter(enemySprite.getBoundingClientRect());
    // selfPlayer (healers, thrown at the player rather than the wild
    // monster) uses the player's own center for both ends - throw-arc's own
    // keyframes (Battle/styles.css) still apply a fixed vertical arc
    // percentage regardless of horizontal distance, so an identical
    // from/to still reads as a real toss-up-and-catch, not a no-op.
    const [fromCenter, toCenter] =
      target === "toPlayer"
        ? [enemyCenter, playerCenter]
        : target === "selfPlayer"
        ? [playerCenter, playerCenter]
        : [playerCenter, enemyCenter];
    return {
      from: percentIn(fromCenter, battlefieldRect),
      to: percentIn(toCenter, battlefieldRect),
      angleDeg: angleBetween(fromCenter, toCenter),
    };
  }, []);

  const [, forceTick] = useReducer((n: number) => n + 1, 0);
  // Delayed past ENTRANCE_LOCK_MS (rather than starting to count down from
  // the instant this component mounts) so the wild monster's own attack
  // clock doesn't start running before the player can actually do anything
  // back - the first attack lands WILD_ATTACK_INTERVAL_MS after the
  // entrance sequence (and thus the action bar) actually unlocks, same as
  // every attack after it.
  const nextWildAttackAtRef = useRef(
    Date.now() + ENTRANCE_LOCK_MS + WILD_ATTACK_INTERVAL_MS
  );
  // Goal-battle-only boss mechanic: counts every spit the wild side has
  // thrown at the player so far this battle - every GOAL_SELF_HEAL_INTERVAL_SPITS-th
  // one, a coldnoodle appears beside it as a self-heal (see
  // COLD_NOODLE_TOTAL_MS above) instead of just spitting again.
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
            triggerToast(
              `${GOAL_NAME}吃了涼麵，恢復了體力！`,
              COLD_NOODLE_HEAL_DELAY_MS + HEAL_ANIMATION_MS
            );
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

  // Defeat pauses on the battlefield with a fade overlay before actually
  // leaving - concludeBattle (which swaps this whole screen out) only
  // fires once that fade has had time to play.
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

  // Holds off the sink/fade sequence until every already-thrown attack has
  // actually landed, so a slow throw never gets visually cut off mid-flight
  // by the losing sprite sinking or the screen fading out under it.
  useEffect(() => {
    if (pendingOutcome === null || isSinking) return;
    if (
      throwEffects.length > 0 ||
      spitEffect !== null ||
      enemySpitEffect !== null
    )
      return;
    setIsSinking(true);
  }, [pendingOutcome, isSinking, throwEffects, spitEffect, enemySpitEffect]);

  useEffect(() => {
    if (!isSinking || pendingOutcome === null) return;
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
    }, OUTCOME_TOTAL_MS);
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

  const buildLine = useCallback((order: number[]): AttackOption[] => {
    const options: AttackOption[] = [
      {
        key: INNATE_KEY,
        label: "小風溥儀",
        icon: PLAYER_SPRITE,
        isHealer: false,
        healAmount: 0,
        family: null,
        step: 0,
      },
    ];
    order.forEach((id) => {
      const monster = MONSTERS[id];
      options.push({
        key: String(id),
        label: monster.name,
        icon: monster.icon,
        isHealer: monster.isHealer,
        healAmount: monster.healAmount ?? 0,
        family: monster.attackFamily,
        step: monster.attackStep,
      });
    });
    return options;
  }, []);

  // The attack line's order - starts as the innate attack first, then
  // gameStore.monsterOrder (shared with, and reorderable from, the map's own
  // duckling trail - see store/types.ts), but from here on the innate
  // attack is just as reorderable as any captured monster (tapping it sends
  // it to the back/front of the line same as anything else). Its own
  // position is never persisted, though - a fresh battle always starts it
  // back at the front, so this is local state, only the captured-monster
  // portion syncs out to reorderMonsters on every reorder.
  const [line, setLine] = useState<AttackOption[]>(() =>
    buildLine(monsterOrder)
  );

  // Attack buttons currently mid-reorder animation - leaving their old spot
  // (narrowing to nothing) before `line` actually reorders them, then
  // entering their new spot once it has.
  const [leavingKeys, setLeavingKeys] = useState<Set<string>>(new Set());
  const [enteringKeys, setEnteringKeys] = useState<Set<string>>(new Set());

  // Alternates every throw between sending the tapped group to the back of
  // the (captured-monster) line and bringing it to the front - the 1st tap
  // this battle goes to the back, the 2nd to the front, the 3rd to the
  // back, and so on. The innate attack never joins this cycle (see
  // isInnateOnly below) - it always stays in its fixed first slot.
  const [nextPlacement, setNextPlacement] = useState<"back" | "front">("back");

  // A cooling-down monster can't actually be thrown right now, so it can't
  // contribute to (or extend) a family run's bonus - treating it as
  // family-less for grouping purposes (same as the innate attack always is)
  // breaks the chain there exactly like a different family would, without
  // attackGroups.ts needing to know anything about cooldowns itself.
  const buildGroupableLine = useCallback(
    (now: number) =>
      line.map((option) => ({
        ...option,
        // trueFamily survives regardless of cooldown - the family dot (see
        // render below) always shows it so a player can plan adjacency
        // even while an attack is still cooling down; only `family` itself
        // (what actually drives grouping/glow) gets neutralized.
        trueFamily: option.family,
        family: (cooldowns[option.key] ?? 0) <= now ? option.family : null,
      })),
    [line, cooldowns]
  );

  // The line split into maximal adjacent-same-family runs - each run is one
  // visual grouping box, and what tapping any of its members throws together.
  // Recomputed fresh every render (not memoized on a snapshot of `now`) so a
  // neighbor's cooldown ending is reflected as soon as the periodic tick
  // below causes the next re-render, same as the cooldown overlays' own
  // live countdown.
  const attackGroups = groupByAdjacentFamily(buildGroupableLine(Date.now()));

  // Hints for the horizontally-scrolling attack grid, so players know there
  // are more (cooling-down or not) attacks off to a side rather than
  // assuming the visible row is the whole roster.
  const attackGridRef = useRef<HTMLDivElement | null>(null);
  // One entry per currently-rendered attack button, keyed by option.key - lets
  // handleAttack read a member's actual live width every frame while it
  // shrinks/grows, rather than precomputing a single guessed width.
  const buttonRefs = useRef<Record<string, HTMLButtonElement | null>>({});
  // The in-flight requestAnimationFrame loop (if any) that's currently
  // riding scrollLeft along with a leaving/entering member's own live width -
  // tracked so a second tap before the first one settles cancels the stale
  // loop instead of fighting it for control of scrollLeft.
  const scrollCompensationFrameRef = useRef<number | null>(null);
  useEffect(
    () => () => {
      if (scrollCompensationFrameRef.current !== null) {
        cancelAnimationFrame(scrollCompensationFrameRef.current);
      }
    },
    []
  );
  const [canScrollLeft, setCanScrollLeft] = useState(false);
  const [canScrollRight, setCanScrollRight] = useState(false);
  const updateScrollHints = useCallback(() => {
    const el = attackGridRef.current;
    if (!el) return;
    setCanScrollLeft(el.scrollLeft > 0);
    setCanScrollRight(el.scrollLeft + el.clientWidth < el.scrollWidth - 1);
  }, []);
  useEffect(() => {
    updateScrollHints();
    window.addEventListener("resize", updateScrollHints);
    return () => window.removeEventListener("resize", updateScrollHints);
  }, [line, updateScrollHints]);

  const handleAttack = useCallback(
    (option: AttackOption) => {
      if (pendingOutcome !== null || isEntering) return;
      const now = Date.now();
      if ((cooldowns[option.key] ?? 0) > now) return;

      // Tapping any member of an adjacent-same-family run throws the whole
      // run together - a lone innate attack (or a captured monster with no
      // same-family (ready) neighbor) is just a run of one, same as before.
      const group = findGroupContaining(buildGroupableLine(now), option.key);
      const isInnateOnly = group.length === 1 && group[0].key === INNATE_KEY;

      let totalHeal = 0;
      const throwers: Array<{ member: AttackOption; multiplier: number }> = [];
      const healers: Array<{ member: AttackOption; multiplier: number }> = [];

      group.forEach((member, index) => {
        const multiplier = groupMultiplierAt(member.step, index);
        if (member.isHealer) {
          totalHeal += member.healAmount * multiplier;
          healers.push({ member, multiplier });
        } else {
          throwers.push({ member, multiplier });
        }
      });

      if (healers.length > 0) {
        // Same staggered volley as throwers below - each healer flies in
        // GROUP_THROW_STAGGER_MS after the last, just thrown at the player
        // rather than the wild monster ("selfPlayer" - the player's own
        // center for both ends of the throw, a self-toss rather than a
        // cross-battlefield shot). The heal glow itself (which builds/
        // holds/releases over HEAL_ANIMATION_MS - HP only actually recovers
        // once that whole animation finishes, not instantly) only starts
        // once every one of them has actually landed, so a multi-healer
        // group reads as a real volley arriving before the glow, rather
        // than one simultaneous flash.
        playBump(playerSpriteRef.current, attackBumpKeyframes(20), EFFECT_DURATION_MS);
        healers.forEach(({ member }, throwIndex) => {
          setTimeout(() => {
            const trajectory = getTrajectory("selfPlayer");
            if (!trajectory) return;
            triggerThrow(member.icon, trajectory.from, trajectory.to, true);
          }, throwIndex * GROUP_THROW_STAGGER_MS);
        });
        const healLandMs =
          (healers.length - 1) * GROUP_THROW_STAGGER_MS + THROW_DURATION_MS;
        const healToastText =
          group.length > 1 && group[0].family
            ? `${group[0].family} 系列治療，效果卓越！`
            : `${option.label} 進行治療！`;
        triggerToast(healToastText, healLandMs + HEAL_ANIMATION_MS);
        setTimeout(() => {
          triggerPlayerHeal("heal", HEAL_ANIMATION_MS);
          setTimeout(() => {
            healProtagonist(totalHeal);
          }, HEAL_ANIMATION_MS);
        }, healLandMs);
      }
      if (throwers.length > 0) {
        // Plays even alongside a same-tap heal glow above - the two no
        // longer compete for the same animated property (see playBump).
        playBump(playerSpriteRef.current, attackBumpKeyframes(20), EFFECT_DURATION_MS);
        // A mixed innate + captured-monster group can't happen (the innate
        // attack has no family, so it never joins a group) - launch each
        // thrower GROUP_THROW_STAGGER_MS after the last so a multi-member
        // volley reads as distinguishable throws rather than one blob.
        const landMs = isInnateOnly ? SPIT_DURATION_MS : THROW_DURATION_MS;
        throwers.forEach(({ member, multiplier }, throwIndex) => {
          const throwDelay = throwIndex * GROUP_THROW_STAGGER_MS;
          setTimeout(() => {
            const trajectory = getTrajectory();
            if (!trajectory) return;
            if (member.key === INNATE_KEY) {
              triggerSpit(trajectory.from, trajectory.to, trajectory.angleDeg);
            } else {
              triggerThrow(member.icon, trajectory.from, trajectory.to);
            }
          }, throwDelay);
          // Each member's own damage (ATTACK_DAMAGE * its own step
          // multiplier) lands the instant ITS throw actually arrives,
          // rather than bundling the whole group's damage into one hit
          // once the last member lands - a run of N members should read
          // as N separate hits, not one delayed combined blow.
          setTimeout(() => {
            damageWild(ATTACK_DAMAGE * multiplier);
            playBump(enemySpriteRef.current, hitBumpKeyframes(20), EFFECT_DURATION_MS);
          }, throwDelay + landMs);
        });
        const totalLandMs =
          (throwers.length - 1) * GROUP_THROW_STAGGER_MS + landMs;
        // Only a real multi-member family throw earns the callout - a lone
        // attack (innate or otherwise) never shows one - and it stays up
        // for exactly as long as this whole throw takes to land.
        if (group.length > 1 && group[0].family) {
          triggerToast(
            `${group[0].family} 系列加成，效果卓越`,
            totalLandMs
          );
        }
      }

      group.forEach((member) =>
        setCooldown(member.key, now + ATTACK_COOLDOWN_MS)
      );

      // The innate attack is just as much a part of the queue as any
      // captured monster - tapping it sends it to the back/front the same
      // way. Only its OWN position is never persisted (a fresh battle
      // always starts it at the front); the captured-monster portion syncs
      // out to gameStore.reorderMonsters on every reorder, innate included.
      //
      // A multi-member family throw scatters across both ends rather than
      // moving as one block - each member takes the next spot in the same
      // back/front/back/... cycle, so a repeated group throw doesn't just
      // glue the group back together at one end every time.
      const placements: Array<"back" | "front"> = [];
      let placement = nextPlacement;
      group.forEach(() => {
        placements.push(placement);
        placement = placement === "back" ? "front" : "back";
      });
      setNextPlacement(placement);
      const groupKeys = new Set(group.map((member) => member.key));
      setLeavingKeys((current) => new Set([...current, ...groupKeys]));

      // Every front-placed member ends up ahead of the whole rest of the
      // line, every back-placed member behind all of it - usually all of
      // `group` shares one destination, but a linked group's members can
      // scatter individually between the two (see nextPlacement above).
      const frontMemberKeys = group
        .filter((_, index) => placements[index] === "front")
        .map((member) => member.key);

      // Leave phase: the tapped group collapses at its OLD spot, wherever
      // that happens to be in the line - compensating scrollLeft by only
      // HALF of its own live shrink keeps the group's own shared center
      // visually fixed as it collapses, so its before/after neighbors slide
      // symmetrically toward that point (a purely cosmetic choice - nothing
      // *needs* to stay put here, since the tapped group's old spot isn't
      // "content" anyone still cares about once it's gone).
      //
      // Enter phase is not symmetric between front/back, because the two
      // don't do the same thing to the rest of the line: a back-placed
      // member grows into the empty tail past whatever's already visible -
      // nothing on screen shifts, so it gets no compensation at all. A
      // front-placed member grows at content-position 0, which pushes every
      // *other* button in the line - including the spot the leave phase just
      // finished settling on - rightward by its own full growing width,
      // every frame. That has to be cancelled in FULL (not the leave
      // phase's half), reading the live width every animation frame so it
      // exactly tracks the CSS grow animation - otherwise the row keeps
      // drifting out from under whatever the player was just looking at.
      const gapWidth = attackGridRef.current
        ? parseFloat(getComputedStyle(attackGridRef.current).columnGap) || 0
        : 0;
      const widthSumOf = (keys: string[]): number =>
        keys.reduce((total, key) => {
          const el = buttonRefs.current[key];
          return total + (el ? el.getBoundingClientRect().width : 0);
        }, 0);
      if (attackGridRef.current) {
        const grid = attackGridRef.current;
        const groupKeysArray = group.map((member) => member.key);
        const leaveBaseScrollLeft = grid.scrollLeft;
        const originalGroupWidth = widthSumOf(groupKeysArray);
        const leaveStartTime = performance.now();
        if (scrollCompensationFrameRef.current !== null) {
          cancelAnimationFrame(scrollCompensationFrameRef.current);
        }
        // Stops once the *measured* width has actually reached ~0, rather
        // than after a fixed LEAVE_DURATION_MS elapsed - leaveStartTime is
        // captured synchronously here, before React has even applied
        // .attackButtonLeaving (the class - and the CSS animation it starts
        // - only take effect once this handler returns and React commits/
        // paints), so a wall-clock cutoff measured from this earlier moment
        // stopped compensating slightly before the button actually finished
        // shrinking, leaving a small permanent leftward drift once it fully
        // vanished. SCROLL_COMPENSATION_SAFETY_MS is just a backstop.
        const leaveStep = () => {
          const liveGroupWidth = widthSumOf(groupKeysArray);
          grid.scrollLeft =
            leaveBaseScrollLeft - (originalGroupWidth - liveGroupWidth) / 2;
          scrollCompensationFrameRef.current =
            liveGroupWidth > 0.5 &&
            performance.now() - leaveStartTime < SCROLL_COMPENSATION_SAFETY_MS
              ? requestAnimationFrame(leaveStep)
              : null;
        };
        leaveStep();
      }

      setTimeout(() => {
        let workingLine = line;
        group.forEach((member, index) => {
          workingLine =
            placements[index] === "back"
              ? moveGroupToBack(workingLine, [member])
              : moveGroupToFront(workingLine, [member]);
        });
        setLine(workingLine);
        if (frontMemberKeys.length > 0 && attackGridRef.current) {
          const grid = attackGridRef.current;
          const baseScrollLeft = grid.scrollLeft;
          const startTime = performance.now();
          if (scrollCompensationFrameRef.current !== null) {
            cancelAnimationFrame(scrollCompensationFrameRef.current);
          }
          // Same reasoning as leaveStep above - stops once frontWidthSum
          // has actually stopped growing between two consecutive frames,
          // rather than after a fixed ENTER_DURATION_MS measured from
          // before .attackButtonEntering's own CSS animation really starts.
          // There's no simple constant target to compare against here (each
          // member grows toward its own rendered width, not 0), so this
          // tracks convergence directly instead. -1 as the initial
          // "previous" value guarantees at least one real comparison before
          // ever considering it settled, since a width can never be -1.
          let previousFrontWidthSum = -1;
          const step = () => {
            const frontWidthSum = widthSumOf(frontMemberKeys);
            grid.scrollLeft =
              baseScrollLeft +
              frontWidthSum +
              gapWidth * frontMemberKeys.length;
            const hasSettled = frontWidthSum === previousFrontWidthSum;
            previousFrontWidthSum = frontWidthSum;
            scrollCompensationFrameRef.current =
              !hasSettled &&
              performance.now() - startTime < SCROLL_COMPENSATION_SAFETY_MS
                ? requestAnimationFrame(step)
                : null;
          };
          step();
        }
        reorderMonsters(
          workingLine
            .filter((member) => member.key !== INNATE_KEY)
            .map((member) => Number(member.key))
        );
        setLeavingKeys((current) => {
          const next = new Set(current);
          groupKeys.forEach((key) => next.delete(key));
          return next;
        });
        setEnteringKeys((current) => new Set([...current, ...groupKeys]));
        setTimeout(() => {
          setEnteringKeys((current) => {
            const next = new Set(current);
            groupKeys.forEach((key) => next.delete(key));
            return next;
          });
        }, ENTER_DURATION_MS);
      }, LEAVE_DURATION_MS);
    },
    [
      pendingOutcome,
      isEntering,
      cooldowns,
      line,
      nextPlacement,
      buildGroupableLine,
      reorderMonsters,
      getTrajectory,
      healProtagonist,
      damageWild,
      setCooldown,
      triggerPlayerHeal,
      triggerThrow,
      triggerSpit,
      triggerToast,
    ]
  );

  if (activeMonsterId === null && !isGoalEncounter) return null;
  const enemyName = isGoalEncounter
    ? GOAL_NAME
    : MONSTERS[activeMonsterId!].name;
  const enemyIcon = isGoalEncounter
    ? GOAL_SPRITE
    : MONSTERS[activeMonsterId!].icon;

  const msUntilWildAttack = nextWildAttackAtRef.current - Date.now();
  const isWildTelegraphing =
    msUntilWildAttack > 0 && msUntilWildAttack <= WILD_ATTACK_TELEGRAPH_MS;

  const isPlayerSinking = isSinking && pendingOutcome === "lose";
  const isEnemySinking = isSinking && pendingOutcome === "win";

  return (
    <div className={styles.battle}>
      <div
        className={styles.battlefield}
        ref={battlefieldRef}
        style={{ backgroundImage: `url(${ROAD_TILE})` } as React.CSSProperties}
      >
        <div className={styles.playerSide}>
          <img
            ref={playerSpriteRef}
            src={PLAYER_SPRITE}
            alt="小風"
            className={cn(
              styles.playerSprite,
              isEntering && styles.playerEnter,
              isPlayerSinking
                ? styles.playerSink
                : playerHealEffect && styles.playerHeal
            )}
            style={
              {
                "--enter-delay": `${PLAYER_ENTER_DELAY_MS}ms`,
                "--enter-duration": `${ENTER_PLAYER_MS}ms`,
              } as React.CSSProperties
            }
          />
        </div>
        <div className={styles.enemySide}>
          <div className={styles.enemySpriteWrap}>
            <div
              ref={enemyShadowRef}
              className={cn(
                styles.enemyShadow,
                isEntering && styles.enemyShadowEnter,
                isEnemySinking && styles.enemyShadowSink
              )}
              aria-hidden="true"
              style={
                {
                  "--enter-delay": `${ENEMY_ENTER_DELAY_MS}ms`,
                  "--enter-duration": `${ENTER_ENEMY_MS}ms`,
                } as React.CSSProperties
              }
            />
            <img
              ref={enemySpriteRef}
              src={enemyIcon}
              alt={enemyName}
              className={cn(
                styles.enemySprite,
                isEntering && styles.enemyEnter,
                isEnemySinking
                  ? styles.enemySink
                  : enemyHealEffect && styles.enemyHeal
              )}
              style={
                {
                  "--enter-delay": `${ENEMY_ENTER_DELAY_MS}ms`,
                  "--enter-duration": `${ENTER_ENEMY_MS}ms`,
                } as React.CSSProperties
              }
            />
            {isWildTelegraphing && (
              <div className={styles.telegraph} aria-hidden="true">
                {TELEGRAPH_MARK_DELAYS_MS.map((delayMs, i) => (
                  <span
                    key={i}
                    className={styles.telegraphMark}
                    style={
                      { "--telegraph-delay": `${delayMs}ms` } as React.CSSProperties
                    }
                  >
                    ？
                  </span>
                ))}
              </div>
            )}
            {coldNoodleEffect === "heal" && (
              <img
                src={COLD_NOODLE_SPRITE}
                alt=""
                aria-hidden="true"
                className={styles.coldNoodleSideDish}
              />
            )}
          </div>
        </div>
        <div
          className={cn(styles.enemyInfo, isEntering && styles.infoEnter)}
          style={
            {
              "--enter-delay": `${ENEMY_INFO_DELAY_MS}ms`,
              "--enter-duration": `${INFO_REVEAL_MS}ms`,
            } as React.CSSProperties
          }
        >
          <div>{enemyName}</div>
          <HpBar hp={wildHp} maxHp={wildMaxHp} />
          {isDevMode && (
            <div className={styles.hpDevValue}>
              {wildHp.toFixed(1)} / {wildMaxHp.toFixed(1)}
            </div>
          )}
        </div>
        <div
          className={cn(styles.playerInfo, isEntering && styles.infoEnter)}
          style={
            {
              "--enter-delay": `${PLAYER_INFO_DELAY_MS}ms`,
              "--enter-duration": `${INFO_REVEAL_MS}ms`,
            } as React.CSSProperties
          }
        >
          <div className={styles.nameRow}>
            <span>小風</span>
            <span className={styles.levelBadge}>LV. {line.length}</span>
          </div>
          <HpBar hp={protagonistHp} maxHp={10} />
          {isDevMode && (
            <div className={styles.hpDevValue}>
              {protagonistHp.toFixed(1)} / 10
            </div>
          )}
        </div>
        {throwEffects.map((effect) => (
          <img
            key={effect.id}
            src={effect.icon}
            alt=""
            aria-hidden="true"
            className={cn(
              styles.thrownIcon,
              effect.selfToss && styles.thrownIconSelf
            )}
            style={pointStyle(effect.from, effect.to)}
            onAnimationEnd={() => clearThrow(effect.id)}
          />
        ))}
        {spitEffect !== null && (
          <span
            key={`player-spit-${spitEffect.id}`}
            className={cn(styles.spitDrop, styles.spitDropForward)}
            aria-hidden="true"
            style={spitStyle(spitEffect)}
            onAnimationEnd={clearSpit}
          >
            💧
          </span>
        )}
        {enemySpitEffect !== null && (
          <span
            key={`enemy-spit-${enemySpitEffect.id}`}
            className={cn(styles.spitDrop, styles.spitDropReverse)}
            aria-hidden="true"
            style={spitStyle(enemySpitEffect)}
            onAnimationEnd={clearEnemySpit}
          >
            💧
          </span>
        )}
        {toasts.length > 0 && (
          <div className={styles.toastStack}>
            {toasts.map((toast) => (
              <div
                key={toast.id}
                className={styles.toast}
                style={
                  {
                    "--toast-duration": `${toast.durationMs}ms`,
                  } as React.CSSProperties
                }
              >
                {toast.text}
              </div>
            ))}
          </div>
        )}
      </div>
      <div className={styles.actionBar}>
        <div
          className={cn(
            styles.actionBarContent,
            isEntering && styles.actionBarLocked
          )}
        >
        <div className={styles.buttonRow}>
          <button
            type="button"
            className={styles.escapeButton}
            disabled={pendingOutcome !== null}
            onClick={() =>
              // Escaping below half HP counts as a real loss (same sink
              // animation, battle-loss cooldown, and "lose" outcome
              // conversation as actually being knocked out) - otherwise a
              // player could always bail out right before defeat to dodge
              // the cooldown lock entirely, defeating its whole purpose.
              protagonistHp < PROTAGONIST_MAX_HP / 2
                ? setPendingOutcome("lose")
                : concludeBattle("escape")
            }
          >
            逃跑
          </button>
          {isGoalEncounter && goalDefeatedAt !== null && (
            <button
              type="button"
              className={styles.skipButton}
              disabled={pendingOutcome !== null}
              onClick={() => damageWild(wildHp)}
            >
              跳過戰鬥
            </button>
          )}
          {isDevMode && (
            <>
              <button
                type="button"
                className={styles.devButton}
                disabled={pendingOutcome !== null}
                onClick={() => damageWild(wildHp)}
              >
                贏
              </button>
              <button
                type="button"
                className={styles.devButton}
                disabled={pendingOutcome !== null}
                onClick={() => damageProtagonist(protagonistHp)}
              >
                輸
              </button>
            </>
          )}
        </div>
        {isGoalEncounter && goalDefeatedAt !== null && (
          <div className={styles.goalWinDate}>
            首次通關：{new Date(goalDefeatedAt).toLocaleDateString()}
          </div>
        )}
        <div className={styles.attackGridWrap}>
          <div
            ref={attackGridRef}
            className={styles.attackGrid}
            onScroll={updateScrollHints}
          >
            {attackGroups.map((group) => {
              const isLinked = group.length > 1;
              const groupStyle = isLinked
                ? ({
                    "--family-hue": hueForFamily(
                      group[0].family!,
                      ALL_FAMILIES
                    ),
                  } as React.CSSProperties)
                : undefined;
              return (
                <div
                  key={group[0].key}
                  className={styles.attackGroup}
                  style={groupStyle}
                >
                  {group.map((option, index) => {
                    const remainingMs =
                      (cooldowns[option.key] ?? 0) - Date.now();
                    const ready = remainingMs <= 0;
                    const remainingPercent = Math.max(
                      0,
                      Math.min(100, (remainingMs / ATTACK_COOLDOWN_MS) * 100)
                    );
                    return (
                      <React.Fragment key={option.key}>
                        {index > 0 && (
                          <span
                            className={styles.attackWire}
                            aria-hidden="true"
                          />
                        )}
                        <button
                          type="button"
                          ref={(el) => {
                            buttonRefs.current[option.key] = el;
                          }}
                          className={cn(
                            styles.attackButton,
                            isLinked && styles.attackButtonLinked,
                            leavingKeys.has(option.key) &&
                              styles.attackButtonLeaving,
                            enteringKeys.has(option.key) &&
                              styles.attackButtonEntering,
                            isActionBarRevealing && styles.attackButtonReveal
                          )}
                          disabled={!ready || pendingOutcome !== null || isEntering}
                          onClick={() => handleAttack(option)}
                        >
                          {option.trueFamily !== null && (
                            <span
                              className={styles.familyDot}
                              aria-hidden="true"
                              style={
                                {
                                  "--family-hue": hueForFamily(
                                    option.trueFamily,
                                    ALL_FAMILIES
                                  ),
                                } as React.CSSProperties
                              }
                            />
                          )}
                          <img
                            src={option.icon}
                            alt={option.label}
                            className={styles.attackIcon}
                          />
                          <span className={styles.attackLabel}>
                            {option.isHealer
                              ? `${option.label}（治療）`
                              : option.label}
                          </span>
                          {!ready && (
                            <div
                              className={styles.cooldownOverlay}
                              style={{ height: `${remainingPercent}%` }}
                            />
                          )}
                        </button>
                      </React.Fragment>
                    );
                  })}
                </div>
              );
            })}
          </div>
          {canScrollLeft && (
            <div
              className={cn(styles.scrollHint, styles.scrollHintLeft)}
              aria-hidden="true"
            >
              <span className={styles.scrollHintArrow}>‹</span>
            </div>
          )}
          {canScrollRight && (
            <div
              className={cn(styles.scrollHint, styles.scrollHintRight)}
              aria-hidden="true"
            >
              <span className={styles.scrollHintArrow}>›</span>
            </div>
          )}
        </div>
        </div>
      </div>
      {isSinking && pendingOutcome !== null && (
        <div
          className={cn(
            styles.outcomeFade,
            styles[`outcomeFade${capitalize(pendingOutcome)}`]
          )}
        />
      )}
    </div>
  );
};

const capitalize = (text: string): string =>
  text.charAt(0).toUpperCase() + text.slice(1);

export default Battle;
