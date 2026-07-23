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
import { HpBar } from "./HpBar";
import { PlayerSprite } from "./PlayerSprite";
import { EnemySprite } from "./EnemySprite";
import { EnemyShadow } from "./EnemyShadow";
import { AttackTelegraph } from "./AttackTelegraph";
import { ColdNoodleSprite } from "./ColdNoodleSprite";
import { LevelBadge } from "./LevelBadge";
import { ThrownProjectile } from "./ThrownProjectile";
import { SpitDroplet } from "./SpitDroplet";
import { ToastStack } from "./ToastStack";
import { AttackWire } from "./AttackWire";
import { FamilyDot } from "./FamilyDot";
import { AttackIcon } from "./AttackIcon";
import { CooldownOverlay } from "./CooldownOverlay";
import { ScrollHint } from "./ScrollHint";
import { OutcomeFade } from "./OutcomeFade";
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
import GOAL_SPRITE from "../../assets/goalSprite.png";
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
  // Also read directly inside useAttackGrid (it needs its own copy either
  // way) - kept here too since the dev/skip buttons below call it
  // independently of anything useAttackGrid does.
  const damageWild = useFlowStore((state) => state.damageWild);
  const healWild = useFlowStore((state) => state.healWild);
  const damageProtagonist = useFlowStore((state) => state.damageProtagonist);
  const concludeBattle = useFlowStore((state) => state.concludeBattle);
  const setIsFirstGoalWin = useFlowStore((state) => state.setIsFirstGoalWin);

  const stateKey = useGameStore((state) => state.stateKey);
  const isDevMode = isDevStateKey(stateKey);
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
    activeMonsterId,
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
    cooldowns,
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
    pendingOutcome,
    isEntering,
    playerSpriteRef,
    enemySpriteRef,
    getTrajectory,
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
          <PlayerSprite
            ref={playerSpriteRef}
            isEntering={isEntering}
            isSinking={isPlayerSinking}
            isHealing={playerHealEffect !== null}
            enterDelayMs={PLAYER_ENTER_DELAY_MS}
            enterDurationMs={ENTER_PLAYER_MS}
          />
        </div>
        <div className={styles.enemySide}>
          <div className={styles.enemySpriteWrap}>
            <EnemyShadow
              ref={enemyShadowRef}
              isEntering={isEntering}
              isSinking={isEnemySinking}
              enterDelayMs={ENEMY_ENTER_DELAY_MS}
              enterDurationMs={ENTER_ENEMY_MS}
            />
            <EnemySprite
              ref={enemySpriteRef}
              src={enemyIcon}
              alt={enemyName}
              isEntering={isEntering}
              isSinking={isEnemySinking}
              isHealing={enemyHealEffect !== null}
              enterDelayMs={ENEMY_ENTER_DELAY_MS}
              enterDurationMs={ENTER_ENEMY_MS}
            />
            {isWildTelegraphing && (
              <AttackTelegraph delaysMs={TELEGRAPH_MARK_DELAYS_MS} />
            )}
            {coldNoodleEffect === "heal" && <ColdNoodleSprite />}
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
            <LevelBadge level={line.length} />
          </div>
          <HpBar hp={protagonistHp} maxHp={10} />
          {isDevMode && (
            <div className={styles.hpDevValue}>
              {protagonistHp.toFixed(1)} / 10
            </div>
          )}
        </div>
        {throwEffects.map((effect) => (
          <ThrownProjectile
            key={effect.id}
            effect={effect}
            onLand={() => clearThrow(effect.id)}
          />
        ))}
        {spitEffect !== null && (
          <SpitDroplet
            key={`player-spit-${spitEffect.id}`}
            effect={spitEffect}
            direction="forward"
            onLand={clearSpit}
          />
        )}
        {enemySpitEffect !== null && (
          <SpitDroplet
            key={`enemy-spit-${enemySpitEffect.id}`}
            effect={enemySpitEffect}
            direction="reverse"
            onLand={clearEnemySpit}
          />
        )}
        <ToastStack toasts={toasts} />
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
                        {index > 0 && <AttackWire />}
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
                            <FamilyDot
                              hue={hueForFamily(option.trueFamily, ALL_FAMILIES)}
                            />
                          )}
                          <AttackIcon src={option.icon} alt={option.label} />
                          <span className={styles.attackLabel}>
                            {option.isHealer
                              ? `${option.label}（治療）`
                              : option.label}
                          </span>
                          {!ready && (
                            <CooldownOverlay remainingPercent={remainingPercent} />
                          )}
                        </button>
                      </React.Fragment>
                    );
                  })}
                </div>
              );
            })}
          </div>
          {canScrollLeft && <ScrollHint direction="left" />}
          {canScrollRight && <ScrollHint direction="right" />}
        </div>
        </div>
      </div>
      {isSinking && pendingOutcome !== null && (
        <OutcomeFade outcome={pendingOutcome} />
      )}
    </div>
  );
};

export default Battle;
