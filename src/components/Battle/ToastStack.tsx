import React from "react";
import styles from "./styles.css";
import { ToastEntry } from "./useToastStack";

interface ToastStackProps {
  toasts: ToastEntry[];
}

// The battlefield's callout stack (family-throw bonuses, heal
// announcements, the entrance banners) - see useToastStack's own comment on
// why every trigger appends rather than replacing whatever's showing.
export const ToastStack = ({ toasts }: ToastStackProps) => {
  if (toasts.length === 0) return null;
  return (
    <div className={styles.toastStack}>
      {toasts.map((toast, index) => (
        <div
          key={toast.id}
          className={styles.toastItem}
          style={
            { "--toast-offset": toasts.length - 1 - index } as React.CSSProperties
          }
        >
          <div className={styles.toast}>{toast.text}</div>
        </div>
      ))}
    </div>
  );
};
