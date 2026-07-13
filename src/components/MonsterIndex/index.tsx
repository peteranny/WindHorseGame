import React, { useState } from "react";
import styles from "./styles.css";
import { useGameStore } from "../../store/gameStore";
import MONSTERS from "../../data/monsters/monsters";

const formatDate = (iso: string): string => {
  const date = new Date(iso);
  return `${date.getFullYear()}/${date.getMonth() + 1}/${date.getDate()}`;
};

const MonsterIndex = () => {
  const captured = useGameStore((state) => state.captured);
  const [isOpen, setIsOpen] = useState(false);
  const capturedEntries = Object.keys(captured)
    .map(Number)
    .sort((a, b) => a - b)
    .map((id) => ({ monster: MONSTERS[id], capturedAt: captured[id] }));

  return (
    <>
      <button
        type="button"
        className={styles.toggleButton}
        onClick={() => setIsOpen(true)}
      >
        圖鑑
      </button>
      {isOpen && (
        <div className={styles.overlay} onClick={() => setIsOpen(false)}>
          <div
            className={styles.panel}
            onClick={(e) => e.stopPropagation()}
          >
            <div className={styles.header}>
              <span>
                怪獸圖鑑（{capturedEntries.length}/{MONSTERS.length}）
              </span>
              <button type="button" onClick={() => setIsOpen(false)}>
                關閉
              </button>
            </div>
            <div className={styles.grid}>
              {capturedEntries.map(({ monster, capturedAt }) => (
                <div key={monster.id} className={styles.entry}>
                  <img
                    src={monster.icon}
                    alt={monster.name}
                    className={styles.icon}
                  />
                  <div className={styles.name}>{monster.name}</div>
                  <div className={styles.date}>{formatDate(capturedAt)}</div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </>
  );
};

export default MonsterIndex;
