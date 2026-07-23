import React from "react";
import styles from "./styles.css";

interface CooldownOverlayProps {
  remainingPercent: number;
}

// An attack button's own "still cooling down" fill, rising from the
// bottom as remainingPercent counts down toward 0.
export const CooldownOverlay = ({ remainingPercent }: CooldownOverlayProps) => (
  <div
    className={styles.cooldownOverlay}
    style={{ height: `${remainingPercent}%` }}
  />
);
