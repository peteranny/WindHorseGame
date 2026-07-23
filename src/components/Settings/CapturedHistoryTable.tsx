import React from "react";
import styles from "./styles.css";
import MONSTERS from "../../data/monsters/monsters";
import { GOAL_NAME } from "../../data/goalEncounter";
import GOAL_SPRITE from "../../assets/goalSprite.png";
import { CapturedMonsterIcon } from "./CapturedMonsterIcon";
import { formatCaptureTimestamp, sortByCaptureTime } from "./capturedHistory";
import { PersistedGameState } from "../../store/types";

interface CapturedHistoryTableProps {
  captured: PersistedGameState["captured"];
  goalDefeatedAt: string | null;
}

// The capture-order table shared by both of Settings' own history dialogs -
// the player's own (read straight off gameStore) and, for a dev browsing
// another key, that key's own fetched snapshot.
export const CapturedHistoryTable = ({
  captured,
  goalDefeatedAt,
}: CapturedHistoryTableProps) => {
  const capturedOrder = sortByCaptureTime(captured);
  return (
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
                <CapturedMonsterIcon src={monster.icon} name={monster.name} />
              </td>
              <td>{formatCaptureTimestamp(captured[monsterId])}</td>
            </tr>
          );
        })}
        {goalDefeatedAt !== null && (
          <tr>
            <td>{capturedOrder.length + 1}</td>
            <td>
              <CapturedMonsterIcon src={GOAL_SPRITE} name={GOAL_NAME} />
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
  );
};
