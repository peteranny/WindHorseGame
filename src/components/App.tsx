import React from "react";
import { Switch, Route } from "react-router-dom";
import Game from "./Game";
import Settings from "./Settings";

const App = () => (
  <Switch>
    <Route path="/settings" component={Settings} />
    <Route path="/" component={Game} />
  </Switch>
);

export default App;
