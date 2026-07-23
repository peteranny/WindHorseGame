import React from "react";
import styles from "./styles.css";

interface AttackIconProps {
  src: string;
  alt: string;
}

export const AttackIcon = ({ src, alt }: AttackIconProps) => (
  <img src={src} alt={alt} className={styles.attackIcon} />
);
