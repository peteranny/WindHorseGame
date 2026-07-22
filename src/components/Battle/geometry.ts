import React from "react";

// A point expressed as a percentage of .battlefield's own box, so throw/spit
// trajectories stay correct no matter the viewport size or how the sprites
// themselves are positioned/anchored within it.
export interface Point {
  xPercent: number;
  yPercent: number;
}

export const rectCenter = (rect: DOMRect): { x: number; y: number } => ({
  x: rect.left + rect.width / 2,
  y: rect.top + rect.height / 2,
});

// `point`'s position as a percentage of `containerRect`'s box - measured
// live rather than hardcoded, so it's always right regardless of how
// either element is currently positioned/sized.
export const percentIn = (
  point: { x: number; y: number },
  containerRect: DOMRect
): Point => ({
  xPercent: ((point.x - containerRect.left) / containerRect.width) * 100,
  yPercent: ((point.y - containerRect.top) / containerRect.height) * 100,
});

// The clockwise rotation (in degrees) that makes the spit glyph's rounded,
// naturally-downward-facing end (see .spitDrop's base rotate(-90deg), its
// own facing at --angle: 0deg) point from `from` toward `to`. Computed from
// real pixel centers rather than the from/to percentages, since those are
// relative to .battlefield's box and would skew the angle whenever it isn't
// perfectly square.
export const angleBetween = (
  from: { x: number; y: number },
  to: { x: number; y: number }
): number => (Math.atan2(to.y - from.y, to.x - from.x) * 180) / Math.PI - 90;

export const pointStyle = (from: Point, to: Point): React.CSSProperties =>
  ({
    "--start-x": `${from.xPercent}%`,
    "--start-y": `${from.yPercent}%`,
    "--end-x": `${to.xPercent}%`,
    "--end-y": `${to.yPercent}%`,
  } as React.CSSProperties);

export interface AngledEffect {
  from: Point;
  to: Point;
  angleDeg: number;
}

export const spitStyle = (effect: AngledEffect): React.CSSProperties =>
  ({
    ...pointStyle(effect.from, effect.to),
    "--angle": `${effect.angleDeg}deg`,
  } as React.CSSProperties);
