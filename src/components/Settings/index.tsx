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

  return (
    <Screen className={styles.screen}>
      <h1>設定</h1>
      <p>目前的存檔金鑰：{stateKey ?? "（尚未設定）"}</p>
      <form
        onSubmit={(e) => {
          e.preventDefault();
          if (input.trim()) setStateKey(input.trim());
        }}
      >
        <input value={input} onChange={(e) => setInput(e.target.value)} />
        <button type="submit">更換金鑰</button>
      </form>
      <button type="button" onClick={() => history.push("/")}>
        返回遊戲
      </button>
      {stateKey === DEV_STATE_KEY && (
        <button
          type="button"
          onClick={() =>
            setDevBattleShortcutsEnabled(!devBattleShortcutsEnabled)
          }
        >
          {devBattleShortcutsEnabled
            ? "停用戰鬥捷徑（Capture／Lose）"
            : "啟用戰鬥捷徑（Capture／Lose）"}
        </button>
      )}
      {__DEPLOY_DATE__ && (
        <p className={styles.advancedInfo}>Last Updated: {__DEPLOY_DATE__}</p>
      )}
    </Screen>
  );
};

export default Settings;
