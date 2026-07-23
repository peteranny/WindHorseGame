import React from "react";
import cn from "classnames";
import styles from "./styles.css";

interface MiniMapCellProps {
  baseClass: "fog" | "wall" | "road";
  markerClass: "player" | "monster" | "goal" | null;
  isTeleportable: boolean;
  onClick?: () => void;
}

// One cell of the corner overview - fog/wall/road underneath, optionally
// topped with a player/monster/goal marker, tappable to teleport when
// isTeleportable (see MiniMap/index.tsx's own passability check).
export const MiniMapCell = ({
  baseClass,
  markerClass,
  isTeleportable,
  onClick,
}: MiniMapCellProps) => (
  <div
    className={cn(
      styles.cell,
      styles[baseClass],
      markerClass && styles[markerClass],
      isTeleportable && styles.teleportable
    )}
    onClick={onClick}
  />
);
