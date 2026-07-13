import { UnlockCondition } from "./types";

const periodMatchesHour = (
  period: "morning" | "afternoon" | "evening" | "night",
  hour: number
): boolean => {
  switch (period) {
    case "morning":
      return hour >= 6 && hour < 12;
    case "afternoon":
      return hour >= 12 && hour < 18;
    case "evening":
      return hour >= 18 && hour < 22;
    case "night":
      return hour >= 22 || hour < 6;
  }
};

export const isUnlockConditionMet = (
  condition: UnlockCondition,
  now: Date
): boolean => {
  switch (condition.type) {
    case "weekday":
      return now.getDay() === condition.day;
    case "timeOfDay":
      return periodMatchesHour(condition.period, now.getHours());
    case "dateDivisibleBy":
      return now.getDate() % condition.divisor === 0;
    case "dateParity":
      return now.getDate() % 2 === (condition.parity === "even" ? 0 : 1);
  }
};
