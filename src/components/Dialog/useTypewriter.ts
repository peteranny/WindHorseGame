import { useEffect, useState } from "react";

const TYPING_INTERVAL_MS = 30;

export const useTypewriter = (text: string): [string, boolean, () => void] => {
  const [length, setLength] = useState(0);

  useEffect(() => {
    setLength(0);
    if (text.length === 0) return undefined;
    const id = setInterval(() => {
      setLength((current) => {
        const next = current + 1;
        if (next >= text.length) {
          clearInterval(id);
          return text.length;
        }
        return next;
      });
    }, TYPING_INTERVAL_MS);
    return () => clearInterval(id);
  }, [text]);

  const complete = (): void => setLength(text.length);

  return [text.slice(0, length), length >= text.length, complete];
};
