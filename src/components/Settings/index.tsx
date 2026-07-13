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
      {__DEPLOY_DATE__ && (
        <p className={styles.advancedInfo}>Last Updated: {__DEPLOY_DATE__}</p>
      )}
    </Screen>
  );
};

export default Settings;
