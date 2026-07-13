export const CELL_TYPE = {
  ROAD: " ",
  WALL: "X",
} as const;

export const compileMap = (mapString: string): string[][] =>
  mapString
    .replace(/^\n*/, "")
    .replace(/\n*$/, "")
    .split("\n")
    .map((rowString) => rowString.split(""));
