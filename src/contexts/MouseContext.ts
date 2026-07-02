import { createContext } from "react";

export interface MousePosition {
  x: number;
  y: number;
}

export default createContext<MousePosition>({ x: 0, y: 0 });
