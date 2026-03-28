import type { Lang } from "../models/lang";

export type Goal = {
  id: string;
  order: number;
  icon: string;
  color: string;
  title: Record<Lang, string>;
  description?: Record<Lang, string>;
};

const bundledGoals: (Goal & { isActive: boolean })[] = require("../assets/data/goals.json");

export function getBundledGoals(): Goal[] {
  return bundledGoals.filter((g) => g.isActive).sort((a, b) => a.order - b.order);
}

export function getActiveGoals(): Goal[] {
  return getBundledGoals();
}
