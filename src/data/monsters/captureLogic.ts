export const captureMonster = (
  captured: Record<number, string>,
  monsterId: number,
  capturedAt: string
): Record<number, string> =>
  monsterId in captured ? captured : { ...captured, [monsterId]: capturedAt };

// Dev-only: undoes a capture, as if it never happened.
export const releaseMonster = (
  captured: Record<number, string>,
  monsterId: number
): Record<number, string> => {
  if (!(monsterId in captured)) return captured;
  const { [monsterId]: _removed, ...rest } = captured;
  return rest;
};

export const isFullyCaptured = (
  captured: Record<number, string>,
  totalMonsters: number
): boolean => Object.keys(captured).length >= totalMonsters;
