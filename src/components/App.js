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
  const center = [width / 2, height / 2];
  return (
    <MouseContext.Provider value={mouse}>
      <Screen
        style={{ display: "flex", flexDirection: "column" }}
        onClick={handleMouseClick}
      >
        <div ref={ref} style={{ flex: 1 }}>
          <div
            style={{
              position: "absolute",
              top: 0,
              left: 0,
              right: 0,
              bottom: 0,
            }}
          >
            <Maze center={center} />
          </div>
        </div>
        <Dialog />
      </Screen>
    </MouseContext.Provider>
  );
};

export default App;
