import React, { useRef } from "react";
import cn from "classnames";
import styles from "./styles.css";
import { useFlowStore } from "../../store/flowStore";
import { useGameStore } from "../../store/gameStore";
import { isDevStateKey } from "../../store/devMode";
import MONSTERS from "../../data/monsters/monsters";
import { ATTACK_COOLDOWN_MS, PROTAGONIST_MAX_HP } from "../../data/monsters/battleFormulas";
import { hueForFamily } from "./attackGroups";
import { GOAL_NAME } from "../../data/goalEncounter";
import { pointStyle, spitStyle } from "./geometry";
import { HpBar } from "./HpBar";
import { useHealEffect } from "./useHealEffect";
import { useThrowEffect } from "./useThrowEffect";
import { useSpitEffect } from "./useSpitEffect";
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
import { useAttackGrid } from "./useAttackGrid";
import { useTrajectory } from "./useTrajectory";
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

  const playerSpriteRef = useRef<HTMLImageElement>(null);
  const enemySpriteRef = useRef<HTMLImageElement>(null);
  // A ground shadow for the enemy, like the map's own .footShadow - bumped
  // in lockstep with the sprite (see the attack-bump call below) so it
  // stays under the sprite's feet during its horizontal lunge instead of
  // sitting fixed while the sprite visibly shifts away from it. Not bumped
  // during the vertical hit-knockback (hitBumpKeyframes has no horizontal
  // component to follow, so there's nothing for the shadow to mirror there).
  const enemyShadowRef = useRef<HTMLDivElement>(null);
  const { battlefieldRef, getTrajectory } = useTrajectory({
    playerSpriteRef,
    enemySpriteRef,
  });

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

  const {
    line,
    attackGroups,
    attackGridRef,
    buttonRefs,
    canScrollLeft,
    canScrollRight,
    updateScrollHints,
    leavingKeys,
    enteringKeys,
    handleAttack,
  } = useAttackGrid({
    monsterOrder,
    cooldowns,
    setCooldown,
    reorderMonsters,
    pendingOutcome,
    isEntering,
    playerSpriteRef,
    enemySpriteRef,
    getTrajectory,
    healProtagonist,
    damageWild,
    triggerPlayerHeal,
    triggerThrow,
    triggerSpit,
    triggerToast,
  });

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
