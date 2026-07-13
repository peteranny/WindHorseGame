import React from "react";
import { useMeasure } from "react-use";
import useMouse from "../hooks/useMouse";
import MouseContext from "../contexts/MouseContext";
import Screen from "./Screen";
import Maze from "./Maze";
import Dialog from "./Dialog";
import Battle from "./Battle";
import StateKeyGate from "./StateKeyGate";
import { useFlowStore } from "../store/flowStore";

const App = () => {
  const [mouse, handleMouseClick] = useMouse();
  const [ref, { width, height }] = useMeasure<HTMLDivElement>();
  const center: [number, number] = [width / 2, height / 2];
  const mode = useFlowStore((state) => state.mode);
  return (
    <MouseContext.Provider value={mouse}>
      <Screen
        style={{ display: "flex", flexDirection: "column" }}
        onClick={handleMouseClick}
      >
        <StateKeyGate>
          {mode === "battle" ? (
            <Battle />
          ) : (
            <>
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
                  {width > 0 && height > 0 && <Maze center={center} />}
                </div>
              </div>
              <Dialog />
            </>
          )}
        </StateKeyGate>
        {__DEPLOY_DATE__ && (
          <div
            style={{
              position: "absolute",
              top: 4,
              right: 8,
              opacity: 0.35,
              pointerEvents: "none",
              color: "white",
            }}
          >
            Last Updated: {__DEPLOY_DATE__}
          </div>
        )}
      </Screen>
    </MouseContext.Provider>
  );
};

export default App;
