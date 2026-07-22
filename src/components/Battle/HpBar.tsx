import React from "react";
import styles from "./styles.css";

interface HpBarProps {
  hp: number;
  maxHp: number;
}

export const HpBar = ({ hp, maxHp }: HpBarProps) => (
  <div className={styles.hpBarOuter}>
    <div
      className={styles.hpBarInner}
      style={{ width: `${maxHp > 0 ? (hp / maxHp) * 100 : 0}%` }}
    />
  </div>
);
