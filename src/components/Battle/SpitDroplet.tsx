import React from "react";
import cn from "classnames";
import styles from "./styles.css";
import { spitStyle } from "./geometry";
import { SpitEffect } from "./useSpitEffect";

interface SpitDropletProps {
  effect: SpitEffect;
  direction: "forward" | "reverse";
  onLand: () => void;
}

// The innate attack's water-drop spit - "forward" for the player's own shot
// at the wild monster, "reverse" for the wild monster's automatic attack
// back at the player.
export const SpitDroplet = ({ effect, direction, onLand }: SpitDropletProps) => (
  <span
    className={cn(
      styles.spitDrop,
      direction === "forward" ? styles.spitDropForward : styles.spitDropReverse
    )}
    aria-hidden="true"
    style={spitStyle(effect)}
    onAnimationEnd={onLand}
  >
    💧
  </span>
);
