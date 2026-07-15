import React from "react";
import cn from "classnames";
import styles from "./styles.css";

interface ScreenProps extends React.HTMLAttributes<HTMLDivElement> {}

// Prevents the browser's native image-drag ghost (user-select: none alone
// doesn't stop it, and there's no CSS-only way to disable it in Firefox) for
// every sprite/icon in the tree, without touching each <img> individually.
const Screen = ({ className, onDragStart, ...props }: ScreenProps) => (
  <div
    className={cn(styles.screen, className)}
    onDragStart={(event) => {
      event.preventDefault();
      onDragStart?.(event);
    }}
    {...props}
  />
);

export default Screen;
