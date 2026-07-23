import React from "react";
import cn from "classnames";
import styles from "./styles.css";
import { PendingOutcome } from "./useBattleOutcome";

interface OutcomeFadeProps {
  outcome: NonNullable<PendingOutcome>;
}

const capitalize = (text: string): string =>
  text.charAt(0).toUpperCase() + text.slice(1);

// The battle-ending sink-then-fade cover (see useBattleOutcome's own
// comment on the win/lose/escape timing split) - a plain white/black fade,
// no sprite or pattern of its own.
export const OutcomeFade = ({ outcome }: OutcomeFadeProps) => (
  <div
    className={cn(
      styles.outcomeFade,
      outcome === "escape"
        ? styles.outcomeFadeQuickTiming
        : styles.outcomeFadeSinkTiming,
      styles[`outcomeFade${capitalize(outcome)}`]
    )}
  />
);
