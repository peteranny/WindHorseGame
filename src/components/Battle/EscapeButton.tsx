import React from "react";
import styles from "./styles.css";
import { PROTAGONIST_MAX_HP } from "../../data/monsters/battleFormulas";
import { PendingOutcome } from "./useBattleOutcome";

interface EscapeButtonProps {
  disabled: boolean;
  protagonistHp: number;
  setPendingOutcome: (outcome: PendingOutcome) => void;
}

// Escaping below half HP counts as a real loss (same sink animation,
// battle-loss cooldown, and "lose" outcome conversation as actually being
// knocked out) - otherwise a player could always bail out right before
// defeat to dodge the cooldown lock entirely, defeating its whole purpose.
// A real escape still plays the same turning-black fade a loss does
// (Battle/index.tsx's isSinking/OutcomeFade) - just without either sprite
// actually sinking, since nothing was defeated.
export const EscapeButton = ({
  disabled,
  protagonistHp,
  setPendingOutcome,
}: EscapeButtonProps) => (
  <button
    type="button"
    className={styles.escapeButton}
    disabled={disabled}
    onClick={() =>
      protagonistHp < PROTAGONIST_MAX_HP / 2
        ? setPendingOutcome("lose")
        : setPendingOutcome("escape")
    }
  >
    逃跑
  </button>
);
