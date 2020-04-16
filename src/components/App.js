import React from "react";
import useQuery from "../hooks/useQuery";
import useMouse from "../hooks/useMouse";
import MouseContext from "../contexts/MouseContext";
import Screen from "./Screen";
import Hello from "./Hello";

const App = () => {
  const [mouse, handleMouseClick] = useMouse();
  const [query, setQuery] = useQuery();
  const n = parseInt(query.n) || 0;
  return (
    <MouseContext.Provider value={mouse}>
      <Screen onClick={handleMouseClick}>
        <Hello n={n} setN={(n) => setQuery({ ...query, n })} />
      </Screen>
    </MouseContext.Provider>
  );
};

export default App;
