import React, {
  useCallback,
  useEffect,
  useMemo,
  useReducer,
  useRef,
  useState,
} from "react";
import cn from "classnames";
import styles from "./styles.css";
import { useFlowStore } from "../../store/flowStore";
import { useGameStore } from "../../store/gameStore";
import MONSTERS from "../../data/monsters/monsters";
import {
  ATTACK_COOLDOWN_MS,
  ATTACK_DAMAGE,
  WILD_ATTACK_DAMAGE,
  WILD_ATTACK_INTERVAL_MS,
} from "../../data/monsters/battleFormulas";
import { PLAYER_SPRITE } from "../../assets/playerSprite.generated";

const INNATE_KEY = "innate";
const TICK_MS = 500;
const EFFECT_DURATION_MS = 300;
const WILD_ATTACK_TELEGRAPH_MS = 2000;
const THROW_DURATION_MS = 2000;
const SPIT_DURATION_MS = 500;
const OUTCOME_PAUSE_MS = 500;
const OUTCOME_FADE_MS = 700;
const OUTCOME_TOTAL_MS = OUTCOME_PAUSE_MS + OUTCOME_FADE_MS;

type SpriteEffect = "attack" | "hit" | "heal" | null;
type PendingOutcome = "win" | "lose" | null;

interface AttackOption {
  key: string;
  label: string;
  icon: string;
  isHealer: boolean;
  healAmount: number;
}

interface ThrowEffect {
  id: number;
  icon: string;
}

const HpBar = ({ hp, maxHp }: { hp: number; maxHp: number }) => (
  <div className={styles.hpBarOuter}>
    <div
      className={styles.hpBarInner}
      style={{ width: `${maxHp > 0 ? (hp / maxHp) * 100 : 0}%` }}
    />
  </div>
);

const useSpriteEffect = (): [SpriteEffect, (effect: SpriteEffect) => void] => {
  const [effect, setEffect] = useState<SpriteEffect>(null);
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const trigger = useCallback((next: SpriteEffect) => {
    setEffect(next);
    if (timeoutRef.current) clearTimeout(timeoutRef.current);
    timeoutRef.current = setTimeout(() => setEffect(null), EFFECT_DURATION_MS);
  }, []);
  return [effect, trigger];
};

// Every captured monster currently mid-throw at the wild monster (the
// innate fist attack has nothing to throw, so it never uses this). Each
// throw gets its own id and its own timeout that removes only itself, so
// throwing a second monster before the first one lands doesn't cut the
// first one's animation short - they each run to completion independently.
const useThrowEffect = (): [ThrowEffect[], (icon: string) => void] => {
  const [effects, setEffects] = useState<ThrowEffect[]>([]);
  const nextIdRef = useRef(0);
  const trigger = useCallback((icon: string) => {
    nextIdRef.current += 1;
    const id = nextIdRef.current;
    setEffects((current) => [...current, { id, icon }]);
    setTimeout(() => {
      setEffects((current) => current.filter((effect) => effect.id !== id));
    }, THROW_DURATION_MS);
  }, []);
  return [effects, trigger];
};

// The innate attack's water-drop spit, shot straight from the player to the
// wild monster. Keyed by an incrementing id, same reasoning as useThrowEffect.
const useSpitEffect = (): [number | null, () => void] => {
  const [effect, setEffect] = useState<number | null>(null);
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const nextIdRef = useRef(0);
  const trigger = useCallback(() => {
    nextIdRef.current += 1;
    setEffect(nextIdRef.current);
    if (timeoutRef.current) clearTimeout(timeoutRef.current);
    timeoutRef.current = setTimeout(() => setEffect(null), SPIT_DURATION_MS);
  }, []);
  return [effect, trigger];
};

const Battle = () => {
  const activeMonsterId = useFlowStore((state) => state.activeMonsterId);
  const wildHp = useFlowStore((state) => state.wildHp);
  const wildMaxHp = useFlowStore((state) => state.wildMaxHp);
  const protagonistHp = useFlowStore((state) => state.protagonistHp);
  const damageWild = useFlowStore((state) => state.damageWild);
  const damageProtagonist = useFlowStore((state) => state.damageProtagonist);
  const healProtagonist = useFlowStore((state) => state.healProtagonist);
  const concludeBattle = useFlowStore((state) => state.concludeBattle);

  const captured = useGameStore((state) => state.captured);
  const cooldowns = useGameStore((state) => state.cooldowns);
  const setCooldown = useGameStore((state) => state.setCooldown);
  const captureMonster = useGameStore((state) => state.captureMonster);

  const [playerEffect, triggerPlayerEffect] = useSpriteEffect();
  const [enemyEffect, triggerEnemyEffect] = useSpriteEffect();
  const [throwEffects, triggerThrow] = useThrowEffect();
  const [spitEffect, triggerSpit] = useSpitEffect();
  const [pendingOutcome, setPendingOutcome] = useState<PendingOutcome>(null);

  const [, forceTick] = useReducer((n: number) => n + 1, 0);
  const nextWildAttackAtRef = useRef(Date.now() + WILD_ATTACK_INTERVAL_MS);

  useEffect(() => {
    const id = setInterval(() => {
      if (pendingOutcome === null && Date.now() >= nextWildAttackAtRef.current) {
        damageProtagonist(WILD_ATTACK_DAMAGE);
        triggerEnemyEffect("attack");
        triggerPlayerEffect("hit");
        nextWildAttackAtRef.current += WILD_ATTACK_INTERVAL_MS;
      }
      forceTick();
    }, TICK_MS);
    return () => clearInterval(id);
  }, [pendingOutcome, damageProtagonist, triggerEnemyEffect, triggerPlayerEffect]);

  // Defeat pauses on the battlefield with a fade overlay before actually
  // leaving - concludeBattle (which swaps this whole screen out) only
  // fires once that fade has had time to play.
  useEffect(() => {
    if (activeMonsterId === null || pendingOutcome !== null) return;
    if (wildHp <= 0) {
      captureMonster(activeMonsterId);
      setPendingOutcome("win");
    } else if (protagonistHp <= 0) {
      setPendingOutcome("lose");
    }
  }, [activeMonsterId, wildHp, protagonistHp, captureMonster, pendingOutcome]);

  useEffect(() => {
    if (pendingOutcome === null) return;
    const id = setTimeout(() => concludeBattle(pendingOutcome), OUTCOME_TOTAL_MS);
    return () => clearTimeout(id);
  }, [pendingOutcome, concludeBattle]);

  const attackOptions: AttackOption[] = useMemo(() => {
    const options: AttackOption[] = [
      {
        key: INNATE_KEY,
        label: "小風溥儀",
        icon: PLAYER_SPRITE,
        isHealer: false,
        healAmount: 0,
      },
    ];
    Object.keys(captured)
      .map(Number)
      .sort((a, b) => a - b)
      .forEach((id) => {
        const monster = MONSTERS[id];
        options.push({
          key: String(id),
          label: monster.name,
          icon: monster.icon,
          isHealer: monster.isHealer,
          healAmount: monster.healAmount ?? 0,
        });
      });
    return options;
  }, [captured]);

  const handleAttack = useCallback(
    (option: AttackOption) => {
      if (pendingOutcome !== null) return;
      const now = Date.now();
      if ((cooldowns[option.key] ?? 0) > now) return;
      if (option.isHealer) {
        healProtagonist(option.healAmount);
        triggerPlayerEffect("heal");
      } else if (option.key === INNATE_KEY) {
        // The hit only lands once the spit actually arrives.
        triggerPlayerEffect("attack");
        triggerSpit();
        setTimeout(() => {
          damageWild(ATTACK_DAMAGE);
          triggerEnemyEffect("hit");
        }, SPIT_DURATION_MS);
      } else {
        // The hit only lands once the thrown monster actually arrives.
        triggerPlayerEffect("attack");
        triggerThrow(option.icon);
        setTimeout(() => {
          damageWild(ATTACK_DAMAGE);
          triggerEnemyEffect("hit");
        }, THROW_DURATION_MS);
      }
      setCooldown(option.key, now + ATTACK_COOLDOWN_MS);
    },
    [
      pendingOutcome,
      cooldowns,
      healProtagonist,
      damageWild,
      setCooldown,
      triggerPlayerEffect,
      triggerEnemyEffect,
      triggerThrow,
      triggerSpit,
    ]
  );

  if (activeMonsterId === null) return null;
  const monster = MONSTERS[activeMonsterId];

  const msUntilWildAttack = nextWildAttackAtRef.current - Date.now();
  const isWildTelegraphing =
    msUntilWildAttack > 0 && msUntilWildAttack <= WILD_ATTACK_TELEGRAPH_MS;
  // The marks appear one at a time as the countdown runs out, so seeing all
  // 3 doubles as a "the attack is imminent" cue.
  const telegraphMarkCount = isWildTelegraphing
    ? Math.min(
        3,
        Math.floor(
          ((WILD_ATTACK_TELEGRAPH_MS - msUntilWildAttack) /
            WILD_ATTACK_TELEGRAPH_MS) *
            3
        ) + 1
      )
    : 0;

  return (
    <div className={styles.battle}>
      <div className={styles.battlefield}>
        <div className={styles.playerSide}>
          <div className={styles.playerInfo}>
            <div>小風</div>
            <HpBar hp={protagonistHp} maxHp={10} />
          </div>
          <img
            src={PLAYER_SPRITE}
            alt="小風"
            className={cn(
              styles.playerSprite,
              playerEffect && styles[`player${capitalize(playerEffect)}`]
            )}
          />
        </div>
        <div className={styles.enemySide}>
          <div className={styles.enemySpriteWrap}>
            <img
              src={monster.icon}
              alt={monster.name}
              className={cn(
                styles.enemySprite,
                enemyEffect && styles[`enemy${capitalize(enemyEffect)}`]
              )}
            />
            {telegraphMarkCount > 0 && (
              <div className={styles.telegraph} aria-hidden="true">
                {Array.from({ length: telegraphMarkCount }, (_, i) => (
                  <span key={i} className={styles.telegraphMark}>
                    ？
                  </span>
                ))}
              </div>
            )}
          </div>
          <div className={styles.enemyInfo}>
            <div>{monster.name}</div>
            <HpBar hp={wildHp} maxHp={wildMaxHp} />
          </div>
        </div>
        {throwEffects.map((effect) => (
          <img
            key={effect.id}
            src={effect.icon}
            alt=""
            aria-hidden="true"
            className={styles.thrownIcon}
          />
        ))}
        {spitEffect !== null && (
          <span key={spitEffect} className={styles.spitDrop} aria-hidden="true">
            💧
          </span>
        )}
      </div>
      <div className={styles.actionBar}>
        <div className={styles.attackGrid}>
          {attackOptions.map((option) => {
            const remainingMs = (cooldowns[option.key] ?? 0) - Date.now();
            const ready = remainingMs <= 0;
            return (
              <button
                key={option.key}
                type="button"
                className={cn(styles.attackButton, !ready && styles.onCooldown)}
                disabled={!ready}
                onClick={() => handleAttack(option)}
              >
                <img
                  src={option.icon}
                  alt={option.label}
                  className={styles.attackIcon}
                />
                <span className={styles.attackLabel}>
                  {option.isHealer ? `${option.label}（治療）` : option.label}
                </span>
                {!ready && (
                  <span className={styles.cooldownBadge}>
                    {Math.ceil(remainingMs / 1000)}s
                  </span>
                )}
              </button>
            );
          })}
        </div>
        <button
          type="button"
          className={styles.escapeButton}
          disabled={pendingOutcome !== null}
          onClick={() => concludeBattle("escape")}
        >
          逃跑
        </button>
      </div>
      {pendingOutcome !== null && (
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
