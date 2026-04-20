export interface WeeklyReport {
  weekId: string;         // e.g. "2026-W15"
  generatedAt: number;    // unix ms
  lang: "pt" | "en" | "es";
  headline: string;       // short motivational headline
  summary: string;        // 2-3 sentence recap of the week
  highlight: string;      // single most interesting thing learned
  suggestion: string;     // what to study next week
  mentorTrackId?: string; // track id with lowest avg quiz score (weakest area)
  stats: {
    sessionsCompleted: number;
    minutesStudied: number;
    xpEarned: number;
    topTracks: string[];  // track ids, up to 3
  };
}

export interface MonthlyReport {
  monthId: string;        // e.g. "2026-04"
  generatedAt: number;    // unix ms
  lang: "pt" | "en" | "es";
  headline: string;
  summary: string;
  growth: string;         // progress trend observation
  challenge: string;      // goal for next month
  stats: {
    sessionsCompleted: number;
    minutesStudied: number;
    xpEarned: number;
    topTracks: string[];
    avgQuizScore: number;
  };
}
