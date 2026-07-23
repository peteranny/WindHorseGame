import React from "react";
import styles from "./styles.css";

interface AttackTelegraphProps {
  delaysMs: readonly number[];
}

// The wild monster's own "about to attack" warning marks (see
// useWildAttackClock's TELEGRAPH_MARK_DELAYS_MS), shown briefly before each
// automatic hit lands.
export const AttackTelegraph = ({ delaysMs }: AttackTelegraphProps) => (
  <div className={styles.telegraph} aria-hidden="true">
    {delaysMs.map((delayMs, i) => (
      <span
        key={i}
        className={styles.telegraphMark}
        style={{ "--telegraph-delay": `${delayMs}ms` } as React.CSSProperties}
      >
        ？
      </span>
    ))}
  </div>
);
