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

type SpriteEffect = "attack" | "hit" | "heal" | null;

interface AttackOption {
  key: string;
  label: string;
  icon: string;
  isHealer: boolean;
  healAmount: number;
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

  const [, forceTick] = useReducer((n: number) => n + 1, 0);
  const nextWildAttackAtRef = useRef(Date.now() + WILD_ATTACK_INTERVAL_MS);

  useEffect(() => {
    const id = setInterval(() => {
      if (Date.now() >= nextWildAttackAtRef.current) {
        damageProtagonist(WILD_ATTACK_DAMAGE);
        triggerEnemyEffect("attack");
        triggerPlayerEffect("hit");
        nextWildAttackAtRef.current += WILD_ATTACK_INTERVAL_MS;
      }
      forceTick();
    }, TICK_MS);
    return () => clearInterval(id);
  }, [damageProtagonist, triggerEnemyEffect, triggerPlayerEffect]);

  useEffect(() => {
    if (activeMonsterId === null) return;
    if (wildHp <= 0) {
      captureMonster(activeMonsterId);
      concludeBattle("win");
    } else if (protagonistHp <= 0) {
      concludeBattle("lose");
    }
  }, [activeMonsterId, wildHp, protagonistHp, captureMonster, concludeBattle]);

  const attackOptions: AttackOption[] = useMemo(() => {
    const options: AttackOption[] = [
      {
        key: INNATE_KEY,
        label: "小風的拳頭",
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
      const now = Date.now();
      if ((cooldowns[option.key] ?? 0) > now) return;
      if (option.isHealer) {
        healProtagonist(option.healAmount);
        triggerPlayerEffect("heal");
      } else {
        damageWild(ATTACK_DAMAGE);
        triggerPlayerEffect("attack");
        triggerEnemyEffect("hit");
      }
      setCooldown(option.key, now + ATTACK_COOLDOWN_MS);
    },
    [
      cooldowns,
      healProtagonist,
      damageWild,
      setCooldown,
      triggerPlayerEffect,
      triggerEnemyEffect,
    ]
  );

  if (activeMonsterId === null) return null;
  const monster = MONSTERS[activeMonsterId];

  return (
    <div className={styles.battle}>
      <div className={styles.battlefield}>
        <div className={styles.playerSide}>
          <div className={styles.playerInfo}>
            <div>小風 {protagonistHp}/10</div>
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
          <img
            src={monster.icon}
            alt={monster.name}
            className={cn(
              styles.enemySprite,
              enemyEffect && styles[`enemy${capitalize(enemyEffect)}`]
            )}
          />
          <div className={styles.enemyInfo}>
            <div>{monster.name}</div>
            <HpBar hp={wildHp} maxHp={wildMaxHp} />
          </div>
        </div>
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
          onClick={() => concludeBattle("escape")}
        >
          逃跑
        </button>
      </div>
    </div>
  );
};

const capitalize = (text: string): string =>
  text.charAt(0).toUpperCase() + text.slice(1);

export default Battle;
