import React from "react";
import cn from "classnames";
import styles from "./styles.css";
import MONSTERS from "../../data/monsters/monsters";
import { Facing } from "../../store/types";

interface FollowerTrailProps {
  orderedFollowerIds: number[];
  followerPoints: Array<[number, number]>;
  noPathFollowerPoint: [number, number];
  facing: Facing;
  releasable: boolean;
  onRelease: (monsterId: number) => void;
}

// Renders the trailing "duckling train" of captured monsters, front to
// back per orderedFollowerIds - each snapped to its own resampled point
// along the player's walked path (see useFollowerTrail), or the shared
// fallback point while that path isn't long enough to place them
// individually.
const FollowerTrailView = ({
  orderedFollowerIds,
  followerPoints,
  noPathFollowerPoint,
  facing,
  releasable,
  onRelease,
}: FollowerTrailProps) => (
  <div className={styles.followerTrail}>
    {orderedFollowerIds.map((id, i) => {
      const [px, py] =
        followerPoints.length > 0
          ? followerPoints[Math.min(i, followerPoints.length - 1)]
          : noPathFollowerPoint;
      return (
        <div
          key={id}
          className={cn(styles.followerWrap, releasable && styles.releasable)}
          style={{
            left: px,
            top: py,
            zIndex: orderedFollowerIds.length - i,
          }}
          onClick={releasable ? () => onRelease(id) : undefined}
        >
          <img
            src={MONSTERS[id].icon}
            alt={MONSTERS[id].name}
            className={styles.followerIcon}
            style={
              {
                // Unlike the player's own sprite, monster icon art is
                // natively left-facing, so it's "right" that needs the flip.
                "--facing-scale": facing === "right" ? -1 : 1,
              } as React.CSSProperties
            }
          />
          {releasable && (
            <span className={styles.followerReleaseBadge} aria-hidden="true">
              ✕
            </span>
          )}
        </div>
      );
    })}
  </div>
);

export default FollowerTrailView;
