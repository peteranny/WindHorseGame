import React, { useEffect, useState } from "react";
import { useGameStore } from "../../store/gameStore";
import styles from "./styles.css";

interface StateKeyGateProps {
  children: React.ReactNode;
}

const StateKeyGate = ({ children }: StateKeyGateProps) => {
  const stateKey = useGameStore((state) => state.stateKey);
  const hydrated = useGameStore((state) => state.hydrated);
  const setStateKey = useGameStore((state) => state.setStateKey);
  const hydrate = useGameStore((state) => state.hydrate);
  const [input, setInput] = useState("");

  useEffect(() => {
    if (stateKey) {
      hydrate();
    } else if (typeof google === "undefined") {
      setStateKey("local-dev");
    }
  }, [stateKey, hydrate, setStateKey]);

  if (!stateKey) {
    return (
      <div className={styles.prompt}>
        <form
          onSubmit={(e) => {
            e.preventDefault();
            if (input.trim()) setStateKey(input.trim());
          }}
        >
          <p>請輸入你的存檔金鑰：</p>
          <input
            value={input}
            onChange={(e) => setInput(e.target.value)}
            autoFocus
          />
          <button type="submit">確認</button>
        </form>
      </div>
    );
  }

  if (!hydrated) return null;

  return <>{children}</>;
};

export default StateKeyGate;
