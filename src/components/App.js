import React from "react";
import useQuery from "../hooks/useQuery";

const App = () => {
  const [query, setQuery] = useQuery();
  const n = parseInt(query.n) || 0;
  return (
    <div>
      Hello world: {n}
      <button onClick={() => setQuery({ ...query, n: n + 1 })}>Add</button>
    </div>
  );
};

export default App;
