export const computeMonsterIds = (map: string[][]): (number | null)[][] => {
  let nextId = 0;
  return map.map((row) =>
    row.map((cell) => (cell === "M" ? nextId++ : null))
  );
};
