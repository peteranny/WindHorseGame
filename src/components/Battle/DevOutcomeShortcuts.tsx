import React from "react";
import styles from "./styles.css";

interface DevOutcomeShortcutsProps {
  disabled: boolean;
  onWin: () => void;
  onLose: () => void;
}

// Dev-only "贏"/"輸" shortcuts (Battle/index.tsx's own isDevMode gate) -
// each just deals lethal damage through the normal damageWild/
// damageProtagonist path, so it behaves exactly like a real killing blow
// (capture, fade, outcome conversation, all included) rather than a
// separate force-win code path.
export const DevOutcomeShortcuts = ({
  disabled,
  onWin,
  onLose,
}: DevOutcomeShortcutsProps) => (
  <>
    <button
      type="button"
      className={styles.devButton}
      disabled={disabled}
      onClick={onWin}
    >
      贏
    </button>
    <button
      type="button"
      className={styles.devButton}
      disabled={disabled}
      onClick={onLose}
    >
      輸
    </button>
  </>
);
