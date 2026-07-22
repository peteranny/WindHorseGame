import React from "react";
import styles from "./styles.css";
import { useLingeringMode } from "../../hooks/useLingeringMode";
import ConversationView from "./ConversationView";

const Dialog = () => {
  // Lingers on "conversation" through the entering-battle transition's own
  // freeze/flash/cover-in delay - see useLingeringMode - so the terminal
  // page's last line stays on screen instead of vanishing the instant
  // enterBattle() flips flowStore.mode, well before the screen is actually
  // covered.
  const mode = useLingeringMode();
  return (
    <div className={styles.outer}>
      <div className={styles.inner}>
        {mode === "conversation" && <ConversationView />}
      </div>
    </div>
  );
};

export default Dialog;
