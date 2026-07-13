export const captureMonster = (
  captured: Record<number, string>,
  monsterId: number,
  capturedAt: string
): Record<number, string> =>
  monsterId in captured ? captured : { ...captured, [monsterId]: capturedAt };

export const isFullyCaptured = (
  captured: Record<number, string>,
  totalMonsters: number
): boolean => Object.keys(captured).length >= totalMonsters;
