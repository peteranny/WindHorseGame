import React from "react";
import { useMeasure } from "react-use";
import { Link } from "react-router-dom";
import useMouse from "../../hooks/useMouse";
import MouseContext from "../../contexts/MouseContext";
import Screen from "../Screen";
import Maze from "../Maze";
import Dialog from "../Dialog";
import Battle from "../Battle";
import StateKeyGate from "../StateKeyGate";
import MonsterIndex from "../MonsterIndex";
import MiniMap from "../MiniMap";
import ScreenTransition from "../ScreenTransition";
import { useFlowStore } from "../../store/flowStore";

const Game = () => {
  const [mouse, handleMouseClick] = useMouse();
  const [ref, { width, height }] = useMeasure<HTMLDivElement>();
  const center: [number, number] = [width / 2, height / 2];
  const mode = useFlowStore((state) => state.mode);
  const screenKey = mode === "battle" ? "battle" : "game";
  return (
    <MouseContext.Provider value={mouse}>
      <Screen
        style={{ display: "flex", flexDirection: "column" }}
        onClick={handleMouseClick}
      >
        <StateKeyGate>
          <ScreenTransition screenKey={screenKey}>
            {mode === "battle" ? (
              <Battle />
            ) : (
              <>
                <div ref={ref} style={{ flex: 1, position: "relative" }}>
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
                  <MonsterIndex />
                  <MiniMap />
                  <Link
                    to="/settings"
                    style={{
                      position: "absolute",
                      top: "calc(8px * var(--scale))",
                      right: "calc(8px * var(--scale))",
                      fontSize: "inherit",
                      padding:
                        "calc(6px * var(--scale)) calc(12px * var(--scale))",
                      border: "2px solid black",
                      borderRadius: "4px",
                      background: "white",
                      color: "black",
                      textDecoration: "none",
                    }}
                  >
                    設定
                  </Link>
                </div>
                <Dialog />
              </>
            )}
          </ScreenTransition>
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

export default Game;
