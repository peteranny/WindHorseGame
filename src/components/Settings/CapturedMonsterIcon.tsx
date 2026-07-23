import React from "react";
import styles from "./styles.css";

interface CapturedMonsterIconProps {
  src: string;
  name: string;
}

// One row's own icon in the capture-history table - a captured monster's
// icon, or the goal sprite for its own trailing row.
export const CapturedMonsterIcon = ({ src, name }: CapturedMonsterIconProps) => (
  <img className={styles.peekIcon} src={src} alt={name} />
);
