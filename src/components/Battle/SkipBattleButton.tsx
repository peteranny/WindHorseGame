import React from "react";
import styles from "./styles.css";

interface SkipBattleButtonProps {
  disabled: boolean;
  onSkip: () => void;
}

// A real (non-dev) shortcut, shown only once the goal battle has been
// beaten at least once - deals lethal damage through the same damageWild
// path a real killing blow uses, so the win still plays out normally.
export const SkipBattleButton = ({ disabled, onSkip }: SkipBattleButtonProps) => (
  <button
    type="button"
    className={styles.skipButton}
    disabled={disabled}
    onClick={onSkip}
  >
    跳過戰鬥
  </button>
);
