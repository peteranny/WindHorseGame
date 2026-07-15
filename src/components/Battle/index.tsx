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
import { orderByMostRecentlyCaptured } from "../Maze/followerTrail";
import PLAYER_SPRITE from "../../assets/playerSprite.png";

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
): number =>
  (Math.atan2(to.y - from.y, to.x - from.x) * 180) / Math.PI - 90;

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
const useThrowEffect = (): [
  ThrowEffect[],
  (icon: string, from: Point, to: Point) => void
] => {
  const [effects, setEffects] = useState<ThrowEffect[]>([]);
  const nextIdRef = useRef(0);
  const trigger = useCallback((icon: string, from: Point, to: Point) => {
    nextIdRef.current += 1;
    const id = nextIdRef.current;
    setEffects((current) => [...current, { id, icon, from, to }]);
    setTimeout(() => {
      setEffects((current) => current.filter((effect) => effect.id !== id));
    }, THROW_DURATION_MS);
  }, []);
  return [effects, trigger];
};

// The innate attack's water-drop spit, shot straight from the player to the
// wild monster. Keyed by an incrementing id, same reasoning as useThrowEffect.
const useSpitEffect = (): [
  SpitEffect | null,
  (from: Point, to: Point, angleDeg: number) => void
] => {
  const [effect, setEffect] = useState<SpitEffect | null>(null);
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const nextIdRef = useRef(0);
  const trigger = useCallback((from: Point, to: Point, angleDeg: number) => {
    nextIdRef.current += 1;
    setEffect({ id: nextIdRef.current, from, to, angleDeg });
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
  const devBattleShortcutsEnabled = useFlowStore(
    (state) => state.devBattleShortcutsEnabled
  );

  const captured = useGameStore((state) => state.captured);
  const cooldowns = useGameStore((state) => state.cooldowns);
  const setCooldown = useGameStore((state) => state.setCooldown);
  const captureMonster = useGameStore((state) => state.captureMonster);

  const [playerEffect, triggerPlayerEffect] = useSpriteEffect();
  const [enemyEffect, triggerEnemyEffect] = useSpriteEffect();
  const [throwEffects, triggerThrow] = useThrowEffect();
  const [spitEffect, triggerSpit] = useSpitEffect();
  const [pendingOutcome, setPendingOutcome] = useState<PendingOutcome>(null);

  const battlefieldRef = useRef<HTMLDivElement>(null);
  const playerSpriteRef = useRef<HTMLImageElement>(null);
  const enemySpriteRef = useRef<HTMLImageElement>(null);
  // Measured live off the actual rendered sprites rather than hardcoded, so
  // the throw/spit trajectories stay pinned to their true centers - and the
  // spit's rotation to their true angle - no matter how either sprite ends
  // up positioned/sized.
  const getTrajectory = useCallback(():
    | { from: Point; to: Point; angleDeg: number }
    | null => {
    const battlefield = battlefieldRef.current;
    const playerSprite = playerSpriteRef.current;
    const enemySprite = enemySpriteRef.current;
    if (!battlefield || !playerSprite || !enemySprite) return null;
    const battlefieldRect = battlefield.getBoundingClientRect();
    const playerCenter = rectCenter(playerSprite.getBoundingClientRect());
    const enemyCenter = rectCenter(enemySprite.getBoundingClientRect());
    return {
      from: percentIn(playerCenter, battlefieldRect),
      to: percentIn(enemyCenter, battlefieldRect),
      angleDeg: angleBetween(playerCenter, enemyCenter),
    };
  }, []);

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
      setPendingOutcome("win");
    } else if (protagonistHp <= 0) {
      setPendingOutcome("lose");
    }
  }, [activeMonsterId, wildHp, protagonistHp, pendingOutcome]);

  useEffect(() => {
    if (pendingOutcome === null) return;
    const id = setTimeout(() => {
      // Only actually captured once the fade finishes and we're leaving
      // this screen - otherwise the defeated monster would show up in the
      // attack grid below while its own defeat is still being shown above.
      if (pendingOutcome === "win" && activeMonsterId !== null) {
        captureMonster(activeMonsterId);
      }
      concludeBattle(pendingOutcome);
    }, OUTCOME_TOTAL_MS);
    return () => clearTimeout(id);
  }, [pendingOutcome, activeMonsterId, captureMonster, concludeBattle]);

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
    orderByMostRecentlyCaptured(captured).forEach((id) => {
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

  // Hints for the horizontally-scrolling attack grid, so players know there
  // are more (cooling-down or not) attacks off to a side rather than
  // assuming the visible row is the whole roster.
  const attackGridRef = useRef<HTMLDivElement | null>(null);
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
  }, [attackOptions, updateScrollHints]);

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
        const trajectory = getTrajectory();
        if (trajectory) {
          triggerSpit(trajectory.from, trajectory.to, trajectory.angleDeg);
        }
        setTimeout(() => {
          damageWild(ATTACK_DAMAGE);
          triggerEnemyEffect("hit");
        }, SPIT_DURATION_MS);
      } else {
        // The hit only lands once the thrown monster actually arrives.
        triggerPlayerEffect("attack");
        const trajectory = getTrajectory();
        if (trajectory) {
          triggerThrow(option.icon, trajectory.from, trajectory.to);
        }
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
      getTrajectory,
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
      <div className={styles.battlefield} ref={battlefieldRef}>
        <div className={styles.playerSide}>
          <img
            ref={playerSpriteRef}
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
              ref={enemySpriteRef}
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
        </div>
        <div className={styles.enemyInfo}>
          <div>{monster.name}</div>
          <HpBar hp={wildHp} maxHp={wildMaxHp} />
        </div>
        <div className={styles.playerInfo}>
          <div>小風</div>
          <HpBar hp={protagonistHp} maxHp={10} />
        </div>
        {throwEffects.map((effect) => (
          <img
            key={effect.id}
            src={effect.icon}
            alt=""
            aria-hidden="true"
            className={styles.thrownIcon}
            style={pointStyle(effect.from, effect.to)}
          />
        ))}
        {spitEffect !== null && (
          <span
            key={spitEffect.id}
            className={styles.spitDrop}
            aria-hidden="true"
            style={spitStyle(spitEffect)}
          >
            💧
          </span>
        )}
      </div>
      <div className={styles.actionBar}>
        <div className={styles.buttonRow}>
          <button
            type="button"
            className={styles.escapeButton}
            disabled={pendingOutcome !== null}
            onClick={() => concludeBattle("escape")}
          >
            逃跑
          </button>
          {devBattleShortcutsEnabled && (
            <>
              <button
                type="button"
                className={styles.devButton}
                disabled={pendingOutcome !== null}
                onClick={() => damageWild(wildHp)}
              >
                Capture
              </button>
              <button
                type="button"
                className={styles.devButton}
                disabled={pendingOutcome !== null}
                onClick={() => damageProtagonist(protagonistHp)}
              >
                Lose
              </button>
            </>
          )}
        </div>
        <div className={styles.attackGridWrap}>
          <div
            ref={attackGridRef}
            className={styles.attackGrid}
            onScroll={updateScrollHints}
          >
            {attackOptions.map((option) => {
              const remainingMs = (cooldowns[option.key] ?? 0) - Date.now();
              const ready = remainingMs <= 0;
              const remainingPercent = Math.max(
                0,
                Math.min(100, (remainingMs / ATTACK_COOLDOWN_MS) * 100)
              );
              return (
                <button
                  key={option.key}
                  type="button"
                  className={styles.attackButton}
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
                    <div
                      className={styles.cooldownOverlay}
                      style={{ height: `${remainingPercent}%` }}
                    />
                  )}
                </button>
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
