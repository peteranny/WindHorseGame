import React from "react";
import cn from "classnames";
import styles from "./styles.css";

// Staggered so the hearts drift up one after another rather than all in
// lockstep - each's own left offset and start delay (see .loveSmoke's
// animation in styles.css).
const LOVE_SMOKE_HEARTS = [
  { leftPercent: 35, delayMs: 0 },
  { leftPercent: 50, delayMs: 800 },
  { leftPercent: 65, delayMs: 1600 },
];

// Staggered the same way as the hearts above, but each shoots from the
// house's own center up to around the "40" sign (see .firework's animation
// in styles.css) rather than gently drifting - a slightly different left
// offset per instance so they don't all launch from the exact same point.
const GOAL_FIREWORKS = [
  { leftPercent: 30, delayMs: 0 },
  { leftPercent: 50, delayMs: 700 },
  { leftPercent: 70, delayMs: 1400 },
];

// Every spark in one firework's burst flies outward along its own angle,
// evenly spaced around the full circle (see .fireworkSpark's animation -
// each reads this as --spark-angle, a rotate() that points its own
// translate axis outward before any distance is actually applied).
const FIREWORK_SPARK_ANGLES = [0, 45, 90, 135, 180, 225, 270, 315];

// The goal tile's standing "challenged and defeated" marker, once
// gameStore.goalDefeatedAt is set - rising heart emojis, a pulsing neon "40"
// sign (a nod to the game's own 40th-birthday framing), and a few fireworks
// launching from the house's own center up toward that sign. Not tied to any
// particular visit - Maze/index.tsx renders this regardless of houseState,
// identically in both the "empty" and "occupied" states.
const GoalCelebration = () => (
  <>
    <div
      className={cn(styles.loveSmokeWrap, styles.aboveHouse)}
      aria-hidden="true"
    >
      {LOVE_SMOKE_HEARTS.map(({ leftPercent, delayMs }, i) => (
        <span
          key={i}
          className={styles.loveSmoke}
          style={{
            left: `${leftPercent}%`,
            animationDelay: `${delayMs}ms`,
          }}
        >
          💕
        </span>
      ))}
    </div>
    <div className={styles.goalNeonSign} aria-hidden="true">
      40
    </div>
    <div className={styles.fireworkWrap} aria-hidden="true">
      {GOAL_FIREWORKS.map(({ leftPercent, delayMs }, i) => (
        <div
          key={i}
          className={styles.firework}
          style={
            {
              left: `${leftPercent}%`,
              "--firework-delay": `${delayMs}ms`,
            } as React.CSSProperties
          }
        >
          <span className={styles.fireworkRocket} />
          <div className={styles.fireworkBurst}>
            {FIREWORK_SPARK_ANGLES.map((angle, si) => (
              <span
                key={si}
                className={styles.fireworkSpark}
                style={
                  {
                    "--spark-angle": `${angle}deg`,
                  } as React.CSSProperties
                }
              />
            ))}
          </div>
        </div>
      ))}
    </div>
  </>
);

export default GoalCelebration;
