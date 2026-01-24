export type DailySessionMeta = {
  date: string; // "YYYY-MM-DD"
  contentId: string;
  contentVersion: number;
  estimatedMinutes: number;
  trackId?: string;
  difficulty?: 1 | 2 | 3;
  tags?: string[];
};
