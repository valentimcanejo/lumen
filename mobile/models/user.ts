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

export type AchievementId =
  | "first_session"
  | "streak_3"
  | "streak_7"
  | "streak_30"
  | "perfect_quiz"
  | "sessions_10"
  | "sessions_50"
  | "level_5";

export type UserProfile = {
  uid: string;
  lang: Lang;
  dailyGoalMin: 5 | 10 | 15;
  selectedTrackIds: string[];
  premium: PremiumInfo;
  streak: StreakInfo;
  selectedGoalIds: string[];
  savedContentIds?: string[];
  completedContentIds?: string[];
  hasOnboarded: boolean;
  xp?: number;
  level?: number;
  totalSessions?: number;
  achievements?: Partial<Record<AchievementId, number>>; // achievementId → unlockedAt ms
  createdAt: number; // ms
  updatedAt: number; // ms
};

// XP thresholds per level (index = level - 1)
export const LEVEL_XP_THRESHOLDS = [0, 50, 150, 300, 500, 750, 1000, 1500, 2000, 3000];

export function xpToLevel(xp: number): number {
  let level = 1;
  for (let i = 0; i < LEVEL_XP_THRESHOLDS.length; i++) {
    if (xp >= LEVEL_XP_THRESHOLDS[i]) level = i + 1;
    else break;
  }
  return level;
}

export function xpForNextLevel(level: number): number {
  return LEVEL_XP_THRESHOLDS[level] ?? LEVEL_XP_THRESHOLDS[LEVEL_XP_THRESHOLDS.length - 1];
}
