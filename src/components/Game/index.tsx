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
import { useGameStore } from "../../store/gameStore";
import { CELL_SIZE } from "../Maze/cellSize";
import WALL_TILE from "../../assets/wallTile.png";

const Game = () => {
  const [mouse, handleMouseClick] = useMouse();
  const [ref, { width, height }] = useMeasure<HTMLDivElement>();
  const center: [number, number] = [width / 2, height / 2];
  const [playerX, playerY] = useGameStore((state) => state.position);
  const mode = useFlowStore((state) => state.mode);
  const screenKey = mode === "battle" ? "battle" : "game";
  // Same offsetX/offsetY formula Maze itself uses to keep the player's own
  // cell centered on screen - applied here as the infinite wall backdrop's
  // own background-position, so its tiling stays in phase with the actual
  // grid's wall cells as the camera pans, instead of drifting out of sync.
  const backgroundOffsetX = center[0] - CELL_SIZE / 2 - playerX * CELL_SIZE;
  const backgroundOffsetY = center[1] - CELL_SIZE / 2 - playerY * CELL_SIZE;
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
                <div
                  ref={ref}
                  style={{
                    flex: 1,
                    position: "relative",
                    // The map's own grid (map.txt) is a fixed size, but the
                    // camera can pan the player anywhere within it - this
                    // tiles the same wall texture as an infinite backdrop
                    // behind it, so anywhere the grid doesn't reach (e.g.
                    // near a corner) still reads as "more wall" rather than
                    // a flat cutoff color.
                    backgroundImage: `url(${WALL_TILE})`,
                    backgroundRepeat: "repeat",
                    backgroundSize:
                      "calc(100px * var(--scale)) calc(100px * var(--scale))",
                    backgroundPosition: `${backgroundOffsetX}px ${backgroundOffsetY}px`,
                  }}
                >
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
