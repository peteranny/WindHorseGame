import React from "react";
import useMouse from "../hooks/useMouse";
import MouseContext from "../contexts/MouseContext";
import Screen from "./Screen";
import Maze from "./Maze";

const App = () => {
  const [mouse, handleMouseClick] = useMouse();
  return (
    <MouseContext.Provider value={mouse}>
      <Screen onClick={handleMouseClick}>
        <Maze />
      </Screen>
    </MouseContext.Provider>
  );
};

export default App;
