import React, { useCallback, useEffect, useMemo, useReducer, useRef } from "react";
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

const Battle = () => {
  const activeMonsterId = useFlowStore((state) => state.activeMonsterId);
  const wildHp = useFlowStore((state) => state.wildHp);
  const wildMaxHp = useFlowStore((state) => state.wildMaxHp);
  const protagonistHp = useFlowStore((state) => state.protagonistHp);
  const damageWild = useFlowStore((state) => state.damageWild);
  const damageProtagonist = useFlowStore((state) => state.damageProtagonist);
  const healProtagonist = useFlowStore((state) => state.healProtagonist);
  const endEncounter = useFlowStore((state) => state.endEncounter);

  const captured = useGameStore((state) => state.captured);
  const cooldowns = useGameStore((state) => state.cooldowns);
  const setCooldown = useGameStore((state) => state.setCooldown);
  const captureMonster = useGameStore((state) => state.captureMonster);

  const [, forceTick] = useReducer((n: number) => n + 1, 0);
  const nextWildAttackAtRef = useRef(Date.now() + WILD_ATTACK_INTERVAL_MS);

  useEffect(() => {
    const id = setInterval(() => {
      if (Date.now() >= nextWildAttackAtRef.current) {
        damageProtagonist(WILD_ATTACK_DAMAGE);
        nextWildAttackAtRef.current += WILD_ATTACK_INTERVAL_MS;
      }
      forceTick();
    }, TICK_MS);
    return () => clearInterval(id);
  }, [damageProtagonist]);

  useEffect(() => {
    if (activeMonsterId === null) return;
    if (wildHp <= 0) {
      captureMonster(activeMonsterId);
      endEncounter();
    } else if (protagonistHp <= 0) {
      endEncounter();
    }
  }, [
    activeMonsterId,
    wildHp,
    protagonistHp,
    captureMonster,
    endEncounter,
  ]);

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
      if (option.isHealer) healProtagonist(option.healAmount);
      else damageWild(ATTACK_DAMAGE);
      setCooldown(option.key, now + ATTACK_COOLDOWN_MS);
    },
    [cooldowns, healProtagonist, damageWild, setCooldown]
  );

  if (activeMonsterId === null) return null;
  const monster = MONSTERS[activeMonsterId];

  return (
    <div className={styles.battle}>
      <div className={styles.battlefield}>
        <div className={styles.enemyInfo}>
          <div>{monster.name}</div>
          <HpBar hp={wildHp} maxHp={wildMaxHp} />
        </div>
        <img src={monster.icon} alt={monster.name} className={styles.enemySprite} />
        <img
          src={PLAYER_SPRITE}
          alt="小風"
          className={styles.playerSprite}
        />
        <div className={styles.playerInfo}>
          <div>
            小風 {protagonistHp}/10
          </div>
          <HpBar hp={protagonistHp} maxHp={10} />
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
                  <span className={styles.cooldownLabel}>
                    {Math.ceil(remainingMs / 1000)}s
                  </span>
                )}
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
};

export default Battle;
