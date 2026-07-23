import React from "react";
import cn from "classnames";
import styles from "./styles.css";
import { ATTACK_COOLDOWN_MS } from "../../data/monsters/battleFormulas";
import { AttackOption } from "./useAttackLine";
import { FamilyDot } from "./FamilyDot";
import { AttackIcon } from "./AttackIcon";
import { CooldownOverlay } from "./CooldownOverlay";

interface AttackButtonProps {
  option: AttackOption;
  // The raw cooldowns[option.key] timestamp (or 0 if never used) - ready/
  // remainingPercent are derived from it here rather than by the caller,
  // so every render (including the ones driven purely by the cooldown
  // ticking down) recomputes them off the same live Date.now() read.
  cooldownUntil: number;
  hue: number | null;
  isLinked: boolean;
  isLeaving: boolean;
  isReordering: boolean;
  isRevealing: boolean;
  disabled: boolean;
  buttonRef: (el: HTMLButtonElement | null) => void;
  onClick: () => void;
}

// One attack option in the grid - a captured monster, or the innate
// attack. hue !== null only for a member of a real attack family (the
// innate attack's own is always null, see useAttackLine.ts), and is
// always shown via FamilyDot regardless of cooldown so a player can plan
// adjacency ahead of time.
export const AttackButton = ({
  option,
  cooldownUntil,
  hue,
  isLinked,
  isLeaving,
  isReordering,
  isRevealing,
  disabled,
  buttonRef,
  onClick,
}: AttackButtonProps) => {
  const remainingMs = cooldownUntil - Date.now();
  const ready = remainingMs <= 0;
  const remainingPercent = Math.max(
    0,
    Math.min(100, (remainingMs / ATTACK_COOLDOWN_MS) * 100)
  );
  return (
    <button
      type="button"
      ref={buttonRef}
      className={cn(
        styles.attackButton,
        isLinked && styles.attackButtonLinked,
        isLeaving && styles.attackButtonLeaving,
        isReordering && styles.attackButtonEntering,
        isRevealing && styles.attackButtonReveal
      )}
      disabled={!ready || disabled}
      onClick={onClick}
    >
      {hue !== null && <FamilyDot hue={hue} />}
      <AttackIcon src={option.icon} alt={option.label} />
      <span className={styles.attackLabel}>
        {option.isHealer ? `${option.label}（治療）` : option.label}
      </span>
      {!ready && <CooldownOverlay remainingPercent={remainingPercent} />}
    </button>
  );
};
