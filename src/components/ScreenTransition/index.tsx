import React, { useEffect, useRef, useState } from "react";
import styles from "./styles.css";

const TRANSITION_MS = 300;

interface Layer {
  key: string;
  node: React.ReactNode;
  visible: boolean;
}

interface ScreenTransitionProps {
  screenKey: string;
  children: React.ReactNode;
}

const ScreenTransition = ({ screenKey, children }: ScreenTransitionProps) => {
  const [layers, setLayers] = useState<Layer[]>([
    { key: screenKey, node: children, visible: true },
  ]);
  const prevKeyRef = useRef(screenKey);

  useEffect(() => {
    if (prevKeyRef.current === screenKey) return;
    prevKeyRef.current = screenKey;

    setLayers((current) => [
      ...current.map((layer) => ({ ...layer, visible: false })),
      { key: screenKey, node: children, visible: false },
    ]);

    const showTimer = setTimeout(() => {
      setLayers((current) =>
        current.map((layer) =>
          layer.key === screenKey ? { ...layer, visible: true } : layer
        )
      );
    }, 20);

    const cleanupTimer = setTimeout(() => {
      setLayers((current) =>
        current.filter((layer) => layer.key === screenKey)
      );
    }, TRANSITION_MS + 50);

    return () => {
      clearTimeout(showTimer);
      clearTimeout(cleanupTimer);
    };
    // Only the key transition (not every children re-render) should restart the crossfade.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [screenKey]);

  return (
    <div className={styles.stack}>
      {layers.map((layer) => (
        <div
          key={layer.key}
          className={styles.layer}
          style={{ opacity: layer.visible ? 1 : 0 }}
        >
          {layer.key === screenKey ? children : layer.node}
        </div>
      ))}
    </div>
  );
};

export default ScreenTransition;
