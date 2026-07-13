import React from "react";
import styles from "./styles.css";
import { useFlowStore } from "../../store/flowStore";
import ConversationView from "./ConversationView";

const Dialog = () => {
  const mode = useFlowStore((state) => state.mode);
  return (
    <div className={styles.outer}>
      <div className={styles.inner}>
        {mode === "conversation" && <ConversationView />}
      </div>
    </div>
  );
};

export default Dialog;
