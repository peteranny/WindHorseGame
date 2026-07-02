import React from "react";
import cn from "classnames";
import styles from "./styles.css";

interface ScreenProps extends React.HTMLAttributes<HTMLDivElement> {}

const Screen = ({ className, ...props }: ScreenProps) => (
  <div className={cn(styles.screen, className)} {...props} />
);

export default Screen;
