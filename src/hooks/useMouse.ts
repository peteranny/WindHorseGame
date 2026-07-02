import React, { useState, useCallback } from "react";
import type { MousePosition } from "../contexts/MouseContext";

const useMouse = (): [MousePosition, (e: React.MouseEvent) => void] => {
  const [mouse, setMouse] = useState<MousePosition>({ x: 0, y: 0 });
  const handleMouseClick = useCallback((e: React.MouseEvent) => {
    setMouse({ x: e.clientX, y: e.clientY });
  }, []);
  return [mouse, handleMouseClick];
};

export default useMouse;
