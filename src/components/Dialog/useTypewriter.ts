import { useEffect, useRef, useState } from "react";

const TYPING_INTERVAL_MS = 30;

export const useTypewriter = (
  text: string,
  resetKey: string | number
): [string, boolean, () => void] => {
  const [length, setLength] = useState(0);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    setLength(0);
    intervalRef.current = setInterval(() => {
      setLength((current) => {
        if (current >= text.length) return current;
        return current + 1;
      });
    }, TYPING_INTERVAL_MS);
    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [resetKey]);

  useEffect(() => {
    if (length >= text.length && intervalRef.current) {
      clearInterval(intervalRef.current);
    }
  }, [length, text.length]);

  const complete = (): void => setLength(text.length);

  return [text.slice(0, length), length >= text.length, complete];
};
