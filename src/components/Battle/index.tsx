import React, { useCallback, useEffect, useRef, useState } from "react";
import cn from "classnames";
import styles from "./styles.css";
import { useFlowStore } from "../../store/flowStore";
import { useGameStore } from "../../store/gameStore";
import { isDevStateKey } from "../../store/devMode";
import MONSTERS from "../../data/monsters/monsters";
import {
  ATTACK_COOLDOWN_MS,
  ATTACK_DAMAGE,
  PROTAGONIST_MAX_HP,
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
import { Point, rectCenter, percentIn, angleBetween, pointStyle, spitStyle } from "./geometry";
import {
  EFFECT_DURATION_MS,
  attackBumpKeyframes,
  hitBumpKeyframes,
  playBump,
} from "./spriteEffects";
import { HpBar } from "./HpBar";
import { useHealEffect, HEAL_ANIMATION_MS } from "./useHealEffect";
import { useThrowEffect, THROW_DURATION_MS } from "./useThrowEffect";
import { useSpitEffect, SPIT_DURATION_MS } from "./useSpitEffect";
import { useToastStack } from "./useToastStack";
import {
  useEntranceSequence,
  ENTER_ENEMY_MS,
  ENTER_PLAYER_MS,
  INFO_REVEAL_MS,
  ENEMY_ENTER_DELAY_MS,
  PLAYER_ENTER_DELAY_MS,
  ENEMY_INFO_DELAY_MS,
  PLAYER_INFO_DELAY_MS,
} from "./useEntranceSequence";
import { useWildAttackClock, TELEGRAPH_MARK_DELAYS_MS } from "./useWildAttackClock";
import { useBattleOutcome } from "./useBattleOutcome";
import { useAttackLine, AttackOption, INNATE_KEY } from "./useAttackLine";
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
  // The goal battle's own coldnoodle self-heal side dish - reuses this same
  // generic "on/off with a timeout" hook rather than a bespoke one, same as
  // the two heal glows.
  const [coldNoodleEffect, triggerColdNoodle] = useHealEffect();
  const [throwEffects, triggerThrow, clearThrow] = useThrowEffect();
  const [spitEffect, triggerSpit, clearSpit] = useSpitEffect();
  const [enemySpitEffect, triggerEnemySpit, clearEnemySpit] = useSpitEffect();
  const [toasts, triggerToast] = useToastStack();

  const { isEntering, isActionBarRevealing } = useEntranceSequence({
    isGoalEncounter,
    activeMonsterId,
    triggerToast,
  });

  const {
    pendingOutcome,
    setPendingOutcome,
    isSinking,
    isPlayerSinking,
    isEnemySinking,
  } = useBattleOutcome({
    activeMonsterId,
    isGoalEncounter,
    wildHp,
    protagonistHp,
    hasInFlightAttacks:
      throwEffects.length > 0 || spitEffect !== null || enemySpitEffect !== null,
    goalDefeatedAt,
    captureMonster,
    setIsFirstGoalWin,
    recordGoalWin,
    setBattleCooldown,
    concludeBattle,
  });

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

  const { isWildTelegraphing } = useWildAttackClock({
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
  });

  const [line, setLine] = useAttackLine(monsterOrder);

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
              // the cooldown lock entirely, defeating its whole purpose. A
              // real escape still plays the same turning-black fade a loss
              // does (isSinking/.outcomeFade below) - just without either
              // sprite actually sinking, since nothing was defeated.
              protagonistHp < PROTAGONIST_MAX_HP / 2
                ? setPendingOutcome("lose")
                : setPendingOutcome("escape")
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
            pendingOutcome === "escape"
              ? styles.outcomeFadeQuickTiming
              : styles.outcomeFadeSinkTiming,
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
