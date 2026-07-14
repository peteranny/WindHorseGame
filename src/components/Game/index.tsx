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
                  <MiniMap />
                  <Link
                    to="/settings"
                    aria-label="設定"
                    style={{
                      position: "absolute",
                      top: "calc(2px * var(--scale))",
                      right: "calc(2px * var(--scale))",
                      fontSize: "calc(18pt * var(--scale))",
                      lineHeight: 1,
                      padding: "calc(4px * var(--scale))",
                      background: "transparent",
                      color: "black",
                      opacity: 0.4,
                      textDecoration: "none",
                    }}
                  >
                    ⚙
                  </Link>
                </div>
                <Dialog />
              </>
            )}
          </ScreenTransition>
        </StateKeyGate>
      </Screen>
    </MouseContext.Provider>
  );
};

export default Game;
