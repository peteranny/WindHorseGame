import React from "react";
import styles from "./styles.css";

// The "tap to continue" indicator, shown once the current page's text has
// finished typing out.
export const AdvanceCaret = () => (
  <span className={styles.advanceCaret} aria-hidden="true">
    ▼
  </span>
);
