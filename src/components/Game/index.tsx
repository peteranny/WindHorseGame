import React from "react";
import { useMeasure } from "react-use";
import { Link } from "react-router-dom";
import cn from "classnames";
import useMouse from "../../hooks/useMouse";
import MouseContext from "../../contexts/MouseContext";
import Screen from "../Screen";
import Maze from "../Maze";
import Dialog from "../Dialog";
import Battle from "../Battle";
import StateKeyGate from "../StateKeyGate";
import MiniMap from "../MiniMap";
import BattleTransition from "../BattleTransition";
import { useFlowStore } from "../../store/flowStore";
import { useGameStore } from "../../store/gameStore";
import { isDevStateKey } from "../../store/devMode";
import {
  VARIANT_EMOJIS,
  VARIANT_LABELS,
  DEFAULT_VARIANT_EMOJI,
  DEFAULT_VARIANT_LABEL,
} from "../../store/battleTransitionVariants";
import { CELL_SIZE } from "../Maze/cellSize";
import WALL_TILE from "../../assets/wallTile.png";
import styles from "./styles.css";

const Game = () => {
  const [mouse, handleMouseClick] = useMouse();
  const [ref, { width, height }] = useMeasure<HTMLDivElement>();
  const center: [number, number] = [width / 2, height / 2];
  const [playerX, playerY] = useGameStore((state) => state.position);
  const stateKey = useGameStore((state) => state.stateKey);
  const isDevMode = isDevStateKey(stateKey);
  const goalDefeatedAt = useGameStore((state) => state.goalDefeatedAt);
  const resetGoalDefeatedAt = useGameStore(
    (state) => state.resetGoalDefeatedAt
  );
  const mode = useFlowStore((state) => state.mode);
  const devReleaseEnabled = useFlowStore((state) => state.devReleaseEnabled);
  const setDevReleaseEnabled = useFlowStore(
    (state) => state.setDevReleaseEnabled
  );
  const devCooldownLockDisabled = useFlowStore(
    (state) => state.devCooldownLockDisabled
  );
  const setDevCooldownLockDisabled = useFlowStore(
    (state) => state.setDevCooldownLockDisabled
  );
  const devForcedTransitionVariant = useFlowStore(
    (state) => state.devForcedTransitionVariant
  );
  const cycleDevForcedTransitionVariant = useFlowStore(
    (state) => state.cycleDevForcedTransitionVariant
  );
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
          <BattleTransition
            mode={mode}
            battleContent={<Battle />}
            otherContent={
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
                    // Matches Maze's own .withOffset transition (left/top
                    // 0.3s) so the backdrop slides in lockstep with the
                    // grid instead of snapping into place ahead of it.
                    transition: "background-position 0.3s",
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
                  {mode === "map" && (
                    <div
                      style={{
                        position: "absolute",
                        // Same reasoning as MiniMap's own z-index (see its
                        // styles.css comment): this div's ancestors are all
                        // position:relative/absolute with no explicit
                        // z-index of their own, so Maze's .pin (the highest
                        // explicit z-index on the map, 1000) would otherwise
                        // escape upward and paint over these buttons despite
                        // this div coming later in the DOM.
                        zIndex: 2000,
                        top: "calc(2px * var(--scale))",
                        right: "calc(2px * var(--scale))",
                        display: "flex",
                        alignItems: "center",
                        gap: "calc(4px * var(--scale))",
                      }}
                    >
                      {isDevMode && (
                        <>
                          <button
                            type="button"
                            aria-label={
                              devReleaseEnabled
                                ? "停用點擊尾隨怪獸釋放捕獲"
                                : "啟用點擊尾隨怪獸釋放捕獲"
                            }
                            className={cn(
                              styles.devToggle,
                              devReleaseEnabled && styles.devToggleActive
                            )}
                            onClick={() =>
                              setDevReleaseEnabled(!devReleaseEnabled)
                            }
                          >
                            ✕
                          </button>
                          {goalDefeatedAt !== null ? (
                            <button
                              type="button"
                              aria-label="重置已通關紀錄"
                              className={styles.devToggle}
                              onClick={resetGoalDefeatedAt}
                            >
                              ♻️
                            </button>
                          ) : (
                            <button
                              type="button"
                              aria-label={
                                devCooldownLockDisabled
                                  ? "啟用戰敗鎖定倒數"
                                  : "停用戰敗鎖定倒數"
                              }
                              className={cn(
                                styles.devToggle,
                                devCooldownLockDisabled && styles.devToggleActive
                              )}
                              onClick={() =>
                                setDevCooldownLockDisabled(
                                  !devCooldownLockDisabled
                                )
                              }
                            >
                              🔓
                            </button>
                          )}
                          <button
                            type="button"
                            aria-label={`切換戰鬥轉場效果（目前：${
                              devForcedTransitionVariant === null
                                ? DEFAULT_VARIANT_LABEL
                                : VARIANT_LABELS[devForcedTransitionVariant]
                            }）`}
                            className={cn(
                              styles.devToggle,
                              devForcedTransitionVariant !== null &&
                                styles.devToggleActive
                            )}
                            onClick={cycleDevForcedTransitionVariant}
                          >
                            {devForcedTransitionVariant === null
                              ? DEFAULT_VARIANT_EMOJI
                              : VARIANT_EMOJIS[devForcedTransitionVariant]}
                          </button>
                        </>
                      )}
                      <Link
                        to={{ pathname: "/settings", search: window.location.search }}
                        aria-label="設定"
                        style={{
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
                  )}
                </div>
                <Dialog />
              </>
            }
          />
        </StateKeyGate>
      </Screen>
    </MouseContext.Provider>
  );
};

export default Game;
