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
import { SettingsModal } from "./SettingsModal";
import { CapturedHistoryTable } from "./CapturedHistoryTable";
import styles from "./styles.css";

type KeyListStatus = "idle" | "loading" | "loaded";
type PeekStatus = "idle" | "loading" | "found" | "not-found";

const Settings = () => {
  const history = useHistory();
  const stateKey = useGameStore((state) => state.stateKey);
  const setStateKey = useGameStore((state) => state.setStateKey);
  // The player's own capture history - read straight off gameStore rather
  // than fetched separately, since it's already hydrated (local-vs-remote
  // resolved) for whichever key is currently active. This is what keeps
  // the public history dialog below showing only *this* key's own data -
  // there's no code path there that can load anyone else's. The dev-only
  // key browser further down is the one place that deliberately can.
  const captured = useGameStore((state) => state.captured);
  const goalDefeatedAt = useGameStore((state) => state.goalDefeatedAt);
  const isDevMode = isDevStateKey(stateKey);

  const [isChangeKeyDialogOpen, setIsChangeKeyDialogOpen] = useState(false);
  const [keyInput, setKeyInput] = useState("");

  const [isHistoryDialogOpen, setIsHistoryDialogOpen] = useState(false);

  // Dev-only browser listing every key currently in the spreadsheet - the
  // list itself is fetched lazily the first time this dialog opens (never
  // on Settings mount, never refetched once loaded this visit). Each row
  // offers the same two actions as the main card, just aimed at that row's
  // own key instead of the currently active one.
  const [isKeyBrowserDialogOpen, setIsKeyBrowserDialogOpen] = useState(false);
  const [keyListStatus, setKeyListStatus] = useState<KeyListStatus>("idle");
  const [keyOptions, setKeyOptions] = useState<string[]>([]);

  const [isPeekDialogOpen, setIsPeekDialogOpen] = useState(false);
  const [peekKey, setPeekKey] = useState<string | null>(null);
  const [peekStatus, setPeekStatus] = useState<PeekStatus>("idle");
  const [peekCaptured, setPeekCaptured] = useState<
    PersistedGameState["captured"]
  >({});
  const [peekGoalDefeatedAt, setPeekGoalDefeatedAt] = useState<string | null>(
    null
  );

  const openChangeKeyDialog = (): void => {
    setKeyInput(stateKey ?? "");
    setIsChangeKeyDialogOpen(true);
  };

  const openKeyBrowserDialog = (): void => {
    setIsKeyBrowserDialogOpen(true);
    if (keyListStatus === "idle") {
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

  const peekKeyHistory = (key: string): void => {
    setPeekKey(key);
    setIsPeekDialogOpen(true);
    setPeekStatus("loading");
    // Remote (the Google Sheet, the actual source of truth for a key that
    // isn't this browser's own) first, falling back to this browser's own
    // cached snapshot for that key - the only way to test this locally,
    // where google.script.run doesn't exist at all (loadRemoteState always
    // resolves null there).
    loadRemoteState(key).then((remote) => {
      const resolved = remote ?? getLocalSnapshot(key);
      setPeekCaptured(resolved?.captured ?? {});
      setPeekGoalDefeatedAt(resolved?.goalDefeatedAt ?? null);
      setPeekStatus(resolved ? "found" : "not-found");
    });
  };

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
            {isDevMode && (
              <button
                type="button"
                className={styles.devButton}
                onClick={openKeyBrowserDialog}
              >
                瀏覽存檔金鑰（開發用）
              </button>
            )}
          </div>
        </section>

        {__DEPLOY_DATE__ && (
          <p className={styles.advancedInfo}>Last Updated: {__DEPLOY_DATE__}</p>
        )}
      </div>

      {isChangeKeyDialogOpen && (
        <SettingsModal
          title="更換存檔金鑰"
          onClose={() => setIsChangeKeyDialogOpen(false)}
        >
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
        </SettingsModal>
      )}

      {isHistoryDialogOpen && (
        <SettingsModal
          title="捕獲紀錄"
          onClose={() => setIsHistoryDialogOpen(false)}
        >
          <CapturedHistoryTable
            captured={captured}
            goalDefeatedAt={goalDefeatedAt}
          />
        </SettingsModal>
      )}

      {isKeyBrowserDialogOpen && (
        <SettingsModal
          title="所有存檔金鑰"
          onClose={() => setIsKeyBrowserDialogOpen(false)}
        >
          {keyListStatus === "loading" && (
            <p className={styles.peekStatus}>載入中...</p>
          )}
          {keyListStatus === "loaded" && keyOptions.length === 0 && (
            <p className={styles.peekStatus}>找不到任何存檔金鑰</p>
          )}
          {keyListStatus === "loaded" && keyOptions.length > 0 && (
            <ul className={styles.keyOptionList}>
              {keyOptions.map((key) => (
                <li key={key} className={styles.keyBrowserRow}>
                  <span className={styles.keyBrowserKey}>{key}</span>
                  <div className={styles.keyBrowserActions}>
                    <button
                      type="button"
                      className={styles.primaryButton}
                      onClick={() => changeKey(key)}
                    >
                      更換金鑰
                    </button>
                    <button
                      type="button"
                      className={styles.primaryButton}
                      onClick={() => peekKeyHistory(key)}
                    >
                      查詢捕獲紀錄
                    </button>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </SettingsModal>
      )}

      {isPeekDialogOpen && (
        <SettingsModal
          title={peekKey ?? ""}
          onClose={() => setIsPeekDialogOpen(false)}
        >
          {peekStatus === "loading" && (
            <p className={styles.peekStatus}>查詢中...</p>
          )}
          {peekStatus === "not-found" && (
            <p className={styles.peekStatus}>找不到這個金鑰的存檔資料</p>
          )}
          {peekStatus === "found" && (
            <CapturedHistoryTable
              captured={peekCaptured}
              goalDefeatedAt={peekGoalDefeatedAt}
            />
          )}
        </SettingsModal>
      )}
    </Screen>
  );
};

export default Settings;
