import type { TierInfo } from "./user";

export type LeaderboardEntry = {
  uid: string;
  displayName: string;
  weekXp: number;
  level: number;
  updatedAt: number;
};

export type LeaderboardState = {
  entries: LeaderboardEntry[];
  currentUserEntry: LeaderboardEntry | null;
  currentUserRank: number | null;
  weekId: string;
  tier: TierInfo;
};
