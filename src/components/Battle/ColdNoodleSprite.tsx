import React from "react";
import styles from "./styles.css";
import COLD_NOODLE_SPRITE from "../../assets/coldNoodle.png";

// The goal battle's own self-heal side dish (see useWildAttackClock's
// coldnoodle mechanic) - appears beside the goal's sprite like a side dish
// rather than being thrown, purely decorative.
export const ColdNoodleSprite = () => (
  <img
    src={COLD_NOODLE_SPRITE}
    alt=""
    aria-hidden="true"
    className={styles.coldNoodleSideDish}
  />
);
