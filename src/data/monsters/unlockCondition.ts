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

const WEEKDAY_NAMES = [
  "星期日",
  "星期一",
  "星期二",
  "星期三",
  "星期四",
  "星期五",
  "星期六",
];

const PERIOD_DESCRIPTIONS: Record<
  "morning" | "afternoon" | "evening" | "night",
  string
> = {
  morning: "早上6點到中午12點之間",
  afternoon: "中午12點到下午6點之間",
  evening: "晚上6點到10點之間",
  night: "晚上10點到隔天早上6點之間",
};

export const describeUnlockCondition = (condition: UnlockCondition): string => {
  switch (condition.type) {
    case "weekday":
      return `只有在${WEEKDAY_NAMES[condition.day]}才會出現`;
    case "timeOfDay":
      return `只有在${PERIOD_DESCRIPTIONS[condition.period]}才會出現`;
    case "dateDivisibleBy":
      return `只有在日期是${condition.divisor}的倍數時（${condition.divisor}號、${
        condition.divisor * 2
      }號⋯）才會出現`;
    case "dateParity":
      return `只有在日期是${condition.parity === "even" ? "偶數" : "奇數"}時才會出現`;
  }
};
