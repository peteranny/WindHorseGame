export interface Monster {
  id: number;
  identifier: string;
  name: string;
  description: string;
  family: "wind" | "horse";
  icon: string;
  isHealer: boolean;
  healAmount?: number;
}
