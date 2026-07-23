import React from "react";
import styles from "./styles.css";

interface SpeakerPortraitProps {
  src: string;
  name: string;
}

// The current page's own speaker (protagonist/monster/goal) portrait -
// hidden entirely for a "narration" page, which has no speaker of its own.
export const SpeakerPortrait = ({ src, name }: SpeakerPortraitProps) => (
  <img src={src} alt={name} className={styles.portrait} />
);
