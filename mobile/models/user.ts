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
