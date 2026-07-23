import React from "react";
import cn from "classnames";
import styles from "./styles.css";

interface ScrollHintProps {
  direction: "left" | "right";
}

// A small arrow at either edge of the attack grid, shown only while more
// attack options are scrolled out of view in that direction (see
// useAttackGrid's canScrollLeft/canScrollRight).
export const ScrollHint = ({ direction }: ScrollHintProps) => (
  <div
    className={cn(
      styles.scrollHint,
      direction === "left" ? styles.scrollHintLeft : styles.scrollHintRight
    )}
    aria-hidden="true"
  >
    <span className={styles.scrollHintArrow}>
      {direction === "left" ? "‹" : "›"}
    </span>
  </div>
);
