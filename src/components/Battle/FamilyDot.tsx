import React from "react";
import styles from "./styles.css";

interface FamilyDotProps {
  hue: number;
}

// A captured-monster attack's own attack-family indicator - always shown
// regardless of cooldown (see attackGroups.ts's own comment on why it
// reads the option's *true* family rather than the cooldown-neutralized
// one grouping itself uses), so a player can plan adjacency ahead of time.
export const FamilyDot = ({ hue }: FamilyDotProps) => (
  <span
    className={styles.familyDot}
    aria-hidden="true"
    style={{ "--family-hue": hue } as React.CSSProperties}
  />
);
