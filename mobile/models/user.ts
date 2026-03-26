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
  // Sessões
  | "first_session"
  | "sessions_10" | "sessions_50" | "sessions_100" | "sessions_250" | "sessions_500" | "sessions_1000"
  // Streak
  | "streak_3" | "streak_7" | "streak_30" | "streak_60" | "streak_100" | "streak_200" | "streak_365"
  // Quiz perfeito (consecutivos)
  | "perfect_quiz" | "perfect_quiz_3" | "perfect_quiz_5" | "perfect_quiz_10"
  // Quiz streak (dias consecutivos ≥ 80%)
  | "quiz_streak_3" | "quiz_streak_7" | "quiz_streak_14" | "quiz_streak_30"
  // Nível
  | "level_5" | "level_10" | "level_20" | "level_30" | "level_50" | "level_75" | "level_100"
  // Revisão SM-2
  | "reviews_first" | "reviews_50" | "reviews_200" | "reviews_500" | "reviews_1000"
  // Trilhas
  | "track_complete" | "tracks_3" | "tracks_all"
  // XP
  | "xp_100" | "xp_500" | "xp_1000" | "xp_5000"
  // Shield
  | "first_shield"
  // Especial
  | "iluminado";

export type UserProfile = {
  uid: string;
  lang: Lang;
  dailyGoalMin: 5 | 10 | 15;
  /** Tracks the user is actively studying. Primary field post-migration. */
  selectedTrackIds: string[];
  /** @deprecated use selectedTrackIds */
  selectedGoalIds?: string[];
  premium: PremiumInfo;
  streak: StreakInfo;
  hasOnboarded: boolean;
  xp?: number;
  level?: number;
  totalSessions?: number;
  achievements?: Partial<Record<AchievementId, number>>; // achievementId → unlockedAt ms
  totalPerfectQuizzes?: number;
  consecutivePerfectQuizzes?: number;
  totalCardsReviewed?: number;
  consecutiveGoodQuizDays?: number;  // dias consecutivos com quiz ≥ 80%
  lastGoodQuizDate?: string;         // YYYY-MM-DD
  currentMissions?: CurrentMissions;
  currentWeeklyMissions?: CurrentWeeklyMissions;
  starterChallenge?: StarterChallenge;
  createdAt: number; // ms
  updatedAt: number; // ms
};

// ---------------------------------------------------------------------------
// Daily missions
// ---------------------------------------------------------------------------

export type MissionId =
  | "complete_session"
  | "quiz_score_80"
  | "quiz_score_100"
  | "review_cards";

export type DailyMission = {
  id: MissionId;
  xpReward: number;
  completed: boolean;
};

export type CurrentMissions = {
  date: string; // YYYY-MM-DD
  list: DailyMission[];
};

// ---------------------------------------------------------------------------
// Starter challenge — first 3 study days for new users
// ---------------------------------------------------------------------------

export type StarterChallenge = {
  studyDates: string[]; // unique YYYY-MM-DD dates studied, up to 3
  bonusGranted: boolean; // true once the 50 XP bonus was awarded
};

// ---------------------------------------------------------------------------
// Weekly missions
// ---------------------------------------------------------------------------

export type WeeklyMissionId =
  | "complete_5_sessions"
  | "earn_300_xp"
  | "perfect_quiz"
  | "study_3_days";

export type WeeklyMission = {
  id: WeeklyMissionId;
  progress: number;
  target: number;
  xpReward: number;
  completed: boolean;
};

export type CurrentWeeklyMissions = {
  weekId: string; // YYYY-WNN
  list: WeeklyMission[];
  studyDates: string[]; // unique YYYY-MM-DD dates studied this week
};

// ---------------------------------------------------------------------------
// XP / Level — formula-based, supports up to level 100
// threshold(n) = round(30 * (n-1)^1.7)  — slow early, steep late
// At ~25 XP/day: level 10 ≈ 40 days, level 50 ≈ 1.8 years, level 100 ≈ 6 years
// ---------------------------------------------------------------------------

export function levelXpThreshold(level: number): number {
  if (level <= 1) return 0;
  return Math.round(30 * Math.pow(level - 1, 1.7));
}

export function xpToLevel(xp: number): number {
  let level = 1;
  while (level < 100 && xp >= levelXpThreshold(level + 1)) {
    level++;
  }
  return level;
}

export function xpForNextLevel(level: number): number {
  return levelXpThreshold(Math.min(level + 1, 100));
}

// ---------------------------------------------------------------------------
// Tier system
// ---------------------------------------------------------------------------

export type TierId =
  | "bronze"
  | "prata"
  | "ouro"
  | "platina"
  | "safira"
  | "esmeralda"
  | "ametista"
  | "rubi"
  | "diamante"
  | "lumen";

export type TierInfo = {
  id: TierId;
  name: string;
  color: string;
  minLevel: number;
  maxLevel: number;
};

export const TIERS: TierInfo[] = [
  { id: "bronze",    name: "Bronze",    color: "#CD7F32", minLevel: 1,  maxLevel: 9   },
  { id: "prata",     name: "Prata",     color: "#C0C0C0", minLevel: 10, maxLevel: 19  },
  { id: "ouro",      name: "Ouro",      color: "#FFD700", minLevel: 20, maxLevel: 29  },
  { id: "platina",   name: "Platina",   color: "#E8E8E8", minLevel: 30, maxLevel: 39  },
  { id: "safira",    name: "Safira",    color: "#2272FF", minLevel: 40, maxLevel: 49  },
  { id: "esmeralda", name: "Esmeralda", color: "#50C878", minLevel: 50, maxLevel: 59  },
  { id: "ametista",  name: "Ametista",  color: "#9966CC", minLevel: 60, maxLevel: 69  },
  { id: "rubi",      name: "Rubi",      color: "#E0115F", minLevel: 70, maxLevel: 79  },
  { id: "diamante",  name: "Diamante",  color: "#85D1F8", minLevel: 80, maxLevel: 89  },
  { id: "lumen",     name: "Lumen",     color: "#F5C77A", minLevel: 90, maxLevel: 100 },
];

export function getLevelTier(level: number): TierInfo {
  return TIERS.find((t) => level >= t.minLevel && level <= t.maxLevel) ?? TIERS[0];
}
