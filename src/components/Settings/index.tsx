import React, { useState } from "react";
import { useHistory } from "react-router-dom";
import Screen from "../Screen";
import { useGameStore } from "../../store/gameStore";
import styles from "./styles.css";

const Settings = () => {
  const history = useHistory();
  const stateKey = useGameStore((state) => state.stateKey);
  const setStateKey = useGameStore((state) => state.setStateKey);
  const [input, setInput] = useState(stateKey ?? "");

  return (
    <Screen className={styles.screen}>
      <button
        type="button"
        className={styles.closeButton}
        aria-label="返回遊戲"
        onClick={() => history.push("/")}
      >
        ×
      </button>
      <div className={styles.content}>
        <h1 className={styles.title}>設定</h1>

        <section className={styles.card}>
          <p className={styles.currentKey}>
            目前的存檔金鑰：
            <strong>{stateKey ?? "（尚未設定）"}</strong>
          </p>
          <form
            className={styles.keyForm}
            onSubmit={(e) => {
              e.preventDefault();
              if (input.trim()) setStateKey(input.trim());
            }}
          >
            <input
              className={styles.keyInput}
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder="輸入新的存檔金鑰"
            />
            <button type="submit" className={styles.primaryButton}>
              更換金鑰
            </button>
          </form>
        </section>

        {__DEPLOY_DATE__ && (
          <p className={styles.advancedInfo}>Last Updated: {__DEPLOY_DATE__}</p>
        )}
      </div>
    </Screen>
  );
};

export default Settings;
