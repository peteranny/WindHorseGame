export type UnlockCondition =
  | { type: "weekday"; day: number }
  | { type: "timeOfDay"; period: "morning" | "afternoon" | "evening" | "night" }
  | { type: "dateDivisibleBy"; divisor: number }
  | { type: "dateParity"; parity: "even" | "odd" };

export interface Monster {
  id: number;
  identifier: string;
  name: string;
  description: string;
  family: "wind" | "horse";
  icon: string;
  unlockCondition: UnlockCondition;
  isHealer: boolean;
  healAmount?: number;
}
