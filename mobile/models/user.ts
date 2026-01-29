import type { Lang } from "./lang";

export type PremiumInfo = {
  isActive: boolean;
  until?: string; // ISO
};

export type StreakInfo = {
  current: number;
  best: number;
  lastStudyDate?: string; // "YYYY-MM-DD"
  shields: number;
};

export type UserProfile = {
  uid: string;
  lang: Lang;
  dailyGoalMin: 5 | 10 | 15;
  selectedTrackIds: string[];
  premium: PremiumInfo;
  streak: StreakInfo;
  selectedGoalIds: string[];
  hasOnboarded: boolean;
  createdAt: number; // ms
  updatedAt: number; // ms
};
