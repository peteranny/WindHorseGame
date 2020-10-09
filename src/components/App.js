import React from "react";
import { useMeasure } from "react-use";
import useMouse from "../hooks/useMouse";
import MouseContext from "../contexts/MouseContext";
import Screen from "./Screen";
import Maze from "./Maze";
import Dialog from "./Dialog";

const App = () => {
  const [mouse, handleMouseClick] = useMouse();
  const [ref, { width, height }] = useMeasure();
  const [centerX, centerY] = [width / 2, height / 2];
  return (
    <MouseContext.Provider value={mouse}>
      <Screen
        style={{ display: "flex", flexDirection: "column" }}
        onClick={handleMouseClick}
      >
        <div ref={ref} style={{ flex: 1, overflow: "hidden" }}>
          <Maze center={[centerX, centerY]} />
        </div>
        <Dialog />
      </Screen>
    </MouseContext.Provider>
  );
};

export default App;
