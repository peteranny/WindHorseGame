import React from "react";
import cn from "classnames";
import styles from "./styles.css";
import { pointStyle } from "./geometry";
import { ThrowEffect } from "./useThrowEffect";

interface ThrownProjectileProps {
  effect: ThrowEffect;
  onLand: () => void;
}

// A captured monster's icon mid-throw at the wild monster (or, for a
// healer's self-toss, at the player) - see useThrowEffect's own comment on
// why removal is tied to onAnimationEnd rather than a parallel timer.
export const ThrownProjectile = ({ effect, onLand }: ThrownProjectileProps) => (
  <img
    src={effect.icon}
    alt=""
    aria-hidden="true"
    className={cn(styles.thrownIcon, effect.selfToss && styles.thrownIconSelf)}
    style={pointStyle(effect.from, effect.to)}
    onAnimationEnd={onLand}
  />
);
