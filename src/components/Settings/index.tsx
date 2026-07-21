import React, { useState } from "react";
import { useHistory } from "react-router-dom";
import Screen from "../Screen";
import { useGameStore } from "../../store/gameStore";
import { isDevStateKey } from "../../store/devMode";
import { getLocalSnapshot, loadRemoteState } from "../../store/persistence";
import { PersistedGameState } from "../../store/types";
import MONSTERS from "../../data/monsters/monsters";
import { formatCaptureTimestamp, sortByCaptureTime } from "./capturedHistory";
import styles from "./styles.css";

type PeekStatus = "idle" | "loading" | "found" | "not-found";

const Settings = () => {
  const history = useHistory();
  const stateKey = useGameStore((state) => state.stateKey);
  const setStateKey = useGameStore((state) => state.setStateKey);
  const [input, setInput] = useState(stateKey ?? "");
  const isDevMode = isDevStateKey(stateKey);

  const [peekKeyInput, setPeekKeyInput] = useState("");
  const [peekStatus, setPeekStatus] = useState<PeekStatus>("idle");
  const [peekCaptured, setPeekCaptured] = useState<
    PersistedGameState["captured"]
  >({});

  const handlePeek = (e: React.FormEvent): void => {
    e.preventDefault();
    const targetKey = peekKeyInput.trim();
    if (!targetKey) return;
    setPeekStatus("loading");
    // Remote (the Google Sheet, the actual source of truth for a key that
    // isn't this browser's own) first, falling back to this browser's own
    // cached snapshot for that key - the only way to test this locally,
    // where google.script.run doesn't exist at all (loadRemoteState always
    // resolves null there).
    loadRemoteState(targetKey).then((remote) => {
      const resolved = remote ?? getLocalSnapshot(targetKey);
      setPeekCaptured(resolved?.captured ?? {});
      setPeekStatus(resolved ? "found" : "not-found");
    });
  };

  const capturedOrder = sortByCaptureTime(peekCaptured);

  return (
    <Screen className={styles.screen}>
      <button
        type="button"
        className={styles.closeButton}
        aria-label="返回遊戲"
        onClick={() =>
          history.push({ pathname: "/", search: window.location.search })
        }
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
              if (!input.trim()) return;
              setStateKey(input.trim());
              history.push({ pathname: "/", search: window.location.search });
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

        {isDevMode && (
          <section className={styles.card}>
            <p className={styles.currentKey}>查詢金鑰的捕獲紀錄（開發用）</p>
            <form className={styles.keyForm} onSubmit={handlePeek}>
              <input
                className={styles.keyInput}
                value={peekKeyInput}
                onChange={(e) => setPeekKeyInput(e.target.value)}
                placeholder="輸入要查詢的存檔金鑰"
              />
              <button type="submit" className={styles.devButton}>
                查詢
              </button>
            </form>
            {peekStatus === "loading" && (
              <p className={styles.peekStatus}>查詢中...</p>
            )}
            {peekStatus === "not-found" && (
              <p className={styles.peekStatus}>找不到這個金鑰的存檔資料</p>
            )}
            {peekStatus === "found" && (
              <table className={styles.peekTable}>
                <thead>
                  <tr>
                    <th>順序</th>
                    <th>怪獸</th>
                    <th>捕獲時間</th>
                  </tr>
                </thead>
                <tbody>
                  {capturedOrder.map((monsterId, i) => {
                    const monster = MONSTERS.find((m) => m.id === monsterId);
                    if (!monster) return null;
                    return (
                      <tr key={monsterId}>
                        <td>{i + 1}</td>
                        <td>
                          <img
                            className={styles.peekIcon}
                            src={monster.icon}
                            alt={monster.name}
                          />
                        </td>
                        <td>
                          {formatCaptureTimestamp(peekCaptured[monsterId])}
                        </td>
                      </tr>
                    );
                  })}
                  {capturedOrder.length === 0 && (
                    <tr>
                      <td colSpan={3}>尚未捕獲任何怪獸</td>
                    </tr>
                  )}
                </tbody>
              </table>
            )}
          </section>
        )}

        {__DEPLOY_DATE__ && (
          <p className={styles.advancedInfo}>Last Updated: {__DEPLOY_DATE__}</p>
        )}
      </div>
    </Screen>
  );
};

export default Settings;
