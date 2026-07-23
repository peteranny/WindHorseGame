import React, { useState } from "react";
import { useHistory } from "react-router-dom";
import Screen from "../Screen";
import { useGameStore } from "../../store/gameStore";
import { isDevStateKey } from "../../store/devMode";
import { loadRemoteStateKeys } from "../../store/persistence";
import MONSTERS from "../../data/monsters/monsters";
import { GOAL_NAME } from "../../data/goalEncounter";
import GOAL_SPRITE from "../../assets/goalSprite.png";
import { formatCaptureTimestamp, sortByCaptureTime } from "./capturedHistory";
import styles from "./styles.css";

type KeyListStatus = "idle" | "loading" | "loaded";

const Settings = () => {
  const history = useHistory();
  const stateKey = useGameStore((state) => state.stateKey);
  const setStateKey = useGameStore((state) => state.setStateKey);
  // The player's own capture history - read straight off gameStore rather
  // than fetched separately, since it's already hydrated (local-vs-remote
  // resolved) for whichever key is currently active. This is what keeps
  // this screen showing only *this* key's own data - there's no code path
  // here that can load anyone else's.
  const captured = useGameStore((state) => state.captured);
  const goalDefeatedAt = useGameStore((state) => state.goalDefeatedAt);
  const isDevMode = isDevStateKey(stateKey);

  const [isChangeKeyDialogOpen, setIsChangeKeyDialogOpen] = useState(false);
  const [keyInput, setKeyInput] = useState("");
  // Dev-only quick-pick list of every key currently in the spreadsheet -
  // fetched lazily the first time the change-key dialog opens (never on
  // Settings mount, never refetched once loaded this visit).
  const [keyListStatus, setKeyListStatus] = useState<KeyListStatus>("idle");
  const [keyOptions, setKeyOptions] = useState<string[]>([]);

  const [isHistoryDialogOpen, setIsHistoryDialogOpen] = useState(false);

  const openChangeKeyDialog = (): void => {
    setKeyInput(stateKey ?? "");
    setIsChangeKeyDialogOpen(true);
    if (isDevMode && keyListStatus === "idle") {
      setKeyListStatus("loading");
      loadRemoteStateKeys().then((keys) => {
        setKeyOptions([...keys].sort());
        setKeyListStatus("loaded");
      });
    }
  };

  const changeKey = (key: string): void => {
    const trimmed = key.trim();
    if (!trimmed) return;
    setStateKey(trimmed);
    history.push({ pathname: "/", search: window.location.search });
  };

  const capturedOrder = sortByCaptureTime(captured);

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
          <div className={styles.actionButtons}>
            <button
              type="button"
              className={styles.primaryButton}
              onClick={openChangeKeyDialog}
            >
              更換金鑰
            </button>
            <button
              type="button"
              className={styles.primaryButton}
              onClick={() => setIsHistoryDialogOpen(true)}
            >
              查詢捕獲紀錄
            </button>
          </div>
        </section>

        {__DEPLOY_DATE__ && (
          <p className={styles.advancedInfo}>Last Updated: {__DEPLOY_DATE__}</p>
        )}
      </div>

      {isChangeKeyDialogOpen && (
        <div
          className={styles.dialogOverlay}
          onClick={() => setIsChangeKeyDialogOpen(false)}
        >
          <div
            className={styles.dialogBox}
            onClick={(e) => e.stopPropagation()}
          >
            <div className={styles.dialogHeader}>
              <h2 className={styles.dialogTitle}>更換存檔金鑰</h2>
              <button
                type="button"
                className={styles.dialogClose}
                aria-label="關閉"
                onClick={() => setIsChangeKeyDialogOpen(false)}
              >
                ×
              </button>
            </div>
            <form
              className={styles.keyForm}
              onSubmit={(e) => {
                e.preventDefault();
                changeKey(keyInput);
              }}
            >
              <input
                className={styles.keyInput}
                value={keyInput}
                onChange={(e) => setKeyInput(e.target.value)}
                placeholder="輸入存檔金鑰"
              />
              <button type="submit" className={styles.primaryButton}>
                確定
              </button>
            </form>

            {isDevMode && (
              <div className={styles.devKeyList}>
                <p className={styles.devLabel}>開發用：試算表中現有的金鑰</p>
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
                          onClick={() => changeKey(key)}
                        >
                          {key}
                        </button>
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            )}
          </div>
        </div>
      )}

      {isHistoryDialogOpen && (
        <div
          className={styles.dialogOverlay}
          onClick={() => setIsHistoryDialogOpen(false)}
        >
          <div
            className={styles.dialogBox}
            onClick={(e) => e.stopPropagation()}
          >
            <div className={styles.dialogHeader}>
              <h2 className={styles.dialogTitle}>捕獲紀錄</h2>
              <button
                type="button"
                className={styles.dialogClose}
                aria-label="關閉"
                onClick={() => setIsHistoryDialogOpen(false)}
              >
                ×
              </button>
            </div>
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
                      <td>{formatCaptureTimestamp(captured[monsterId])}</td>
                    </tr>
                  );
                })}
                {goalDefeatedAt !== null && (
                  <tr>
                    <td>{capturedOrder.length + 1}</td>
                    <td>
                      <img
                        className={styles.peekIcon}
                        src={GOAL_SPRITE}
                        alt={GOAL_NAME}
                      />
                    </td>
                    <td>{formatCaptureTimestamp(goalDefeatedAt)}</td>
                  </tr>
                )}
                {capturedOrder.length === 0 && goalDefeatedAt === null && (
                  <tr>
                    <td colSpan={3}>尚未捕獲任何怪獸</td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </Screen>
  );
};

export default Settings;
