import React from "react";
import styles from "./styles.css";

interface LevelBadgeProps {
  level: number;
}

export const LevelBadge = ({ level }: LevelBadgeProps) => (
  <span className={styles.levelBadge}>LV. {level}</span>
);
