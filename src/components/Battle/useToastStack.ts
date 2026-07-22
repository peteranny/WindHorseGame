import { useCallback, useRef, useState } from "react";

export interface ToastEntry {
  id: number;
  text: string;
}

// Every toast stays up for exactly this long, regardless of which action
// triggered it - previously each trigger site derived its own durationMs
// from how long its accompanying animation took (a throw's landing time, a
// heal's glow, ...), so toasts faded out at inconsistent points relative to
// each other. A single shared length reads more consistently even though
// it no longer lines up exactly with every animation it accompanies.
export const TOAST_DURATION_MS = 2000;

// The battlefield's callout stack - "X 系列加成，效果卓越" for a real family
// group throw, a healing-specific message whenever a healer (solo or
// grouped) is tapped, and the two entrance banners ("遇到野生的X！",
// "開始！"). Every trigger appends its own entry rather than replacing
// whatever's currently showing (the single-slot version this used to be
// let a second trigger silently cut the first one's banner short) - each
// entry then removes only itself, by id, once TOAST_DURATION_MS elapses,
// same reasoning as useThrowEffect's per-id cleanup. Battle/styles.css's
// .toastStack renders whatever's still in this array anchored at the
// center of the battlefield, oldest on top and the latest (this array's
// last entry) pinned at that center point, so two toasts that happen to
// overlap in time - e.g. attacking the instant the action bar unlocks,
// right as "開始！" is still fading - both stay fully visible, stacked
// one above the other, rather than one clobbering the other.
export const useToastStack = (): [ToastEntry[], (text: string) => void] => {
  const [toasts, setToasts] = useState<ToastEntry[]>([]);
  const nextIdRef = useRef(0);
  const trigger = useCallback((text: string) => {
    nextIdRef.current += 1;
    const id = nextIdRef.current;
    setToasts((current) => [...current, { id, text }]);
    setTimeout(() => {
      setToasts((current) => current.filter((toast) => toast.id !== id));
    }, TOAST_DURATION_MS);
  }, []);
  return [toasts, trigger];
};
