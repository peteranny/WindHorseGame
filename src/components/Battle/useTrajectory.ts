import { RefObject, useCallback, useRef } from "react";
import { Point, rectCenter, percentIn, angleBetween } from "./geometry";

export interface Trajectory {
  from: Point;
  to: Point;
  angleDeg: number;
}

interface UseTrajectoryParams {
  playerSpriteRef: RefObject<HTMLElement>;
  enemySpriteRef: RefObject<HTMLElement>;
}

interface UseTrajectoryResult {
  battlefieldRef: RefObject<HTMLDivElement>;
  // Measured live off the actual rendered sprites rather than hardcoded, so
  // the throw/spit trajectories stay pinned to their true centers - and the
  // spit's rotation to their true angle - no matter how either sprite ends
  // up positioned/sized.
  getTrajectory: (
    target?: "toEnemy" | "toPlayer" | "selfPlayer"
  ) => Trajectory | null;
}

export const useTrajectory = ({
  playerSpriteRef,
  enemySpriteRef,
}: UseTrajectoryParams): UseTrajectoryResult => {
  const battlefieldRef = useRef<HTMLDivElement>(null);

  const getTrajectory = useCallback(
    (
      target: "toEnemy" | "toPlayer" | "selfPlayer" = "toEnemy"
    ): Trajectory | null => {
      const battlefield = battlefieldRef.current;
      const playerSprite = playerSpriteRef.current;
      const enemySprite = enemySpriteRef.current;
      if (!battlefield || !playerSprite || !enemySprite) return null;
      const battlefieldRect = battlefield.getBoundingClientRect();
      const playerCenter = rectCenter(playerSprite.getBoundingClientRect());
      const enemyCenter = rectCenter(enemySprite.getBoundingClientRect());
      // selfPlayer (healers, thrown at the player rather than the wild
      // monster) uses the player's own center for both ends - throw-arc's
      // own keyframes (Battle/styles.css) still apply a fixed vertical arc
      // percentage regardless of horizontal distance, so an identical
      // from/to still reads as a real toss-up-and-catch, not a no-op.
      const [fromCenter, toCenter] =
        target === "toPlayer"
          ? [enemyCenter, playerCenter]
          : target === "selfPlayer"
          ? [playerCenter, playerCenter]
          : [playerCenter, enemyCenter];
      return {
        from: percentIn(fromCenter, battlefieldRect),
        to: percentIn(toCenter, battlefieldRect),
        angleDeg: angleBetween(fromCenter, toCenter),
      };
    },
    // Refs have stable identity across renders, so there's nothing to
    // depend on here - reading .current always sees the latest value
    // regardless of when this callback itself was created.
    []
  );

  return { battlefieldRef, getTrajectory };
};
