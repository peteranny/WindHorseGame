import React, { useState } from "react";
import { useHistory } from "react-router-dom";
import Screen from "../Screen";
import { useGameStore } from "../../store/gameStore";
import { isDevStateKey } from "../../store/devMode";
import {
  getLocalSnapshot,
  loadRemoteState,
  loadRemoteStateKeys,
} from "../../store/persistence";
import { PersistedGameState } from "../../store/types";
import MONSTERS from "../../data/monsters/monsters";
import { GOAL_NAME } from "../../data/goalEncounter";
import GOAL_SPRITE from "../../assets/goalSprite.png";
import { formatCaptureTimestamp, sortByCaptureTime } from "./capturedHistory";
import styles from "./styles.css";

type KeyListStatus = "idle" | "loading" | "loaded";
type PeekStatus = "idle" | "loading" | "found" | "not-found";

const Settings = () => {
  const history = useHistory();
  const stateKey = useGameStore((state) => state.stateKey);
  const setStateKey = useGameStore((state) => state.setStateKey);
  const [input, setInput] = useState(stateKey ?? "");
  const isDevMode = isDevStateKey(stateKey);

  // The key list is only fetched the first time the picker dialog opens
  // (see openKeyDialog) - never on Settings mount, and never again once
  // loaded once per visit here.
  const [isKeyDialogOpen, setIsKeyDialogOpen] = useState(false);
  const [keyListStatus, setKeyListStatus] = useState<KeyListStatus>("idle");
  const [keyOptions, setKeyOptions] = useState<string[]>([]);

  const [isTableDialogOpen, setIsTableDialogOpen] = useState(false);
  const [selectedPeekKey, setSelectedPeekKey] = useState<string | null>(null);
  const [peekStatus, setPeekStatus] = useState<PeekStatus>("idle");
  const [peekCaptured, setPeekCaptured] = useState<
    PersistedGameState["captured"]
  >({});
  const [peekGoalDefeatedAt, setPeekGoalDefeatedAt] = useState<string | null>(
    null
  );

  const openKeyDialog = (): void => {
    setIsKeyDialogOpen(true);
    if (keyListStatus === "idle") {
      setKeyListStatus("loading");
      loadRemoteStateKeys().then((keys) => {
        setKeyOptions(keys);
        setKeyListStatus("loaded");
      });
    }
  };

  const handleSelectKey = (key: string): void => {
    setSelectedPeekKey(key);
    setIsKeyDialogOpen(false);
    setIsTableDialogOpen(true);
    setPeekStatus("loading");
    // Remote (the Google Sheet, the actual source of truth for a key that
    // isn't this browser's own) first, falling back to this browser's own
    // cached snapshot for that key - the only way to test this locally,
    // where google.script.run doesn't exist at all (loadRemoteState always
    // resolves null there). Only ever fetched for the one key just picked,
    // never for every option in the list.
    loadRemoteState(key).then((remote) => {
      const resolved = remote ?? getLocalSnapshot(key);
      setPeekCaptured(resolved?.captured ?? {});
      setPeekGoalDefeatedAt(resolved?.goalDefeatedAt ?? null);
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
            <button
              type="button"
              className={styles.devButton}
              onClick={openKeyDialog}
            >
              查詢捕獲紀錄
            </button>
          </section>
        )}

        {__DEPLOY_DATE__ && (
          <p className={styles.advancedInfo}>Last Updated: {__DEPLOY_DATE__}</p>
        )}
      </div>

      {isKeyDialogOpen && (
        <div
          className={styles.dialogOverlay}
          onClick={() => setIsKeyDialogOpen(false)}
        >
          <div
            className={styles.dialogBox}
            onClick={(e) => e.stopPropagation()}
          >
            <div className={styles.dialogHeader}>
              <h2 className={styles.dialogTitle}>選擇存檔金鑰</h2>
              <button
                type="button"
                className={styles.dialogClose}
                aria-label="關閉"
                onClick={() => setIsKeyDialogOpen(false)}
              >
                ×
              </button>
            </div>
            {keyListStatus === "loading" && (
              <p className={styles.peekStatus}>載入中...</p>
            )}
            {keyListStatus === "loaded" && keyOptions.length === 0 && (
              <p className={styles.peekStatus}>找不到任何存檔金鑰</p>
            )}
            {keyListStatus === "loaded" && keyOptions.length > 0 && (
              <ul className={styles.keyOptionList}>
                {keyOptions.map((key) => (
                  <li key={key}>
                    <button
                      type="button"
                      className={styles.keyOptionButton}
                      onClick={() => handleSelectKey(key)}
                    >
                      {key}
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>
      )}

      {isTableDialogOpen && (
        <div
          className={styles.dialogOverlay}
          onClick={() => setIsTableDialogOpen(false)}
        >
          <div
            className={styles.dialogBox}
            onClick={(e) => e.stopPropagation()}
          >
            <div className={styles.dialogHeader}>
              <h2 className={styles.dialogTitle}>{selectedPeekKey}</h2>
              <button
                type="button"
                className={styles.dialogClose}
                aria-label="關閉"
                onClick={() => setIsTableDialogOpen(false)}
              >
                ×
              </button>
            </div>
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
                  {peekGoalDefeatedAt !== null && (
                    <tr>
                      <td>{capturedOrder.length + 1}</td>
                      <td>
                        <img
                          className={styles.peekIcon}
                          src={GOAL_SPRITE}
                          alt={GOAL_NAME}
                        />
                      </td>
                      <td>{formatCaptureTimestamp(peekGoalDefeatedAt)}</td>
                    </tr>
                  )}
                  {capturedOrder.length === 0 && peekGoalDefeatedAt === null && (
                    <tr>
                      <td colSpan={3}>尚未捕獲任何怪獸</td>
                    </tr>
                  )}
                </tbody>
              </table>
            )}
          </div>
        </div>
      )}
    </Screen>
  );
};

export default Settings;
