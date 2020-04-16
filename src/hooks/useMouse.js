import { useState, useCallback } from "react";

const useMouse = () => {
  const [mouse, setMouse] = useState({ x: 0, y: 0 });
  const handleMouseClick = useCallback((e) => {
    setMouse({
      x: e.clientX,
      y: e.clientY,
    });
  }, []);
  return [mouse, handleMouseClick];
};
export default useMouse;
