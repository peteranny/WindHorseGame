import React, { ReactNode } from "react";
import styles from "./styles.css";

interface SettingsModalProps {
  title: string;
  onClose: () => void;
  children: ReactNode;
}

// The shared dialog shell behind both of Settings' own dialogs (change-key,
// capture history) - a centered box over a dismissible backdrop, with a
// title/close-button header.
export const SettingsModal = ({ title, onClose, children }: SettingsModalProps) => (
  <div className={styles.dialogOverlay} onClick={onClose}>
    <div className={styles.dialogBox} onClick={(e) => e.stopPropagation()}>
      <div className={styles.dialogHeader}>
        <h2 className={styles.dialogTitle}>{title}</h2>
        <button
          type="button"
          className={styles.dialogClose}
          aria-label="關閉"
          onClick={onClose}
        >
          ×
        </button>
      </div>
      {children}
    </div>
  </div>
);
