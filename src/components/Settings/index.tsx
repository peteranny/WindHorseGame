import React, { useState } from "react";
import { useHistory } from "react-router-dom";
import Screen from "../Screen";
import { useGameStore } from "../../store/gameStore";
import { useFlowStore } from "../../store/flowStore";
import styles from "./styles.css";

const DEV_STATE_KEY = "peteranny";

const Settings = () => {
  const history = useHistory();
  const stateKey = useGameStore((state) => state.stateKey);
  const setStateKey = useGameStore((state) => state.setStateKey);
  const [input, setInput] = useState(stateKey ?? "");
  const devBattleShortcutsEnabled = useFlowStore(
    (state) => state.devBattleShortcutsEnabled
  );
  const setDevBattleShortcutsEnabled = useFlowStore(
    (state) => state.setDevBattleShortcutsEnabled
  );
  const devReleaseEnabled = useFlowStore((state) => state.devReleaseEnabled);
  const setDevReleaseEnabled = useFlowStore(
    (state) => state.setDevReleaseEnabled
  );

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

        {stateKey === DEV_STATE_KEY && (
          <section className={styles.devSection}>
            <p className={styles.devLabel}>開發者選項</p>
            <button
              type="button"
              className={styles.devButton}
              onClick={() =>
                setDevBattleShortcutsEnabled(!devBattleShortcutsEnabled)
              }
            >
              {devBattleShortcutsEnabled
                ? "停用戰鬥捷徑（Capture／Lose）"
                : "啟用戰鬥捷徑（Capture／Lose）"}
            </button>
            <button
              type="button"
              className={styles.devButton}
              onClick={() => setDevReleaseEnabled(!devReleaseEnabled)}
            >
              {devReleaseEnabled
                ? "停用點擊尾隨怪獸釋放捕獲"
                : "啟用點擊尾隨怪獸釋放捕獲"}
            </button>
          </section>
        )}

        {__DEPLOY_DATE__ && (
          <p className={styles.advancedInfo}>
            Last Updated: {__DEPLOY_DATE__}
          </p>
        )}
      </div>
    </Screen>
  );
};

export default Settings;
