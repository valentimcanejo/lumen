export interface WeeklyReport {
  weekId: string;         // e.g. "2026-W15"
  generatedAt: number;    // unix ms
  lang: "pt" | "en" | "es";
  headline: string;       // short motivational headline
  summary: string;        // 2-3 sentence recap of the week
  highlight: string;      // single most interesting thing learned
  suggestion: string;     // what to study next week
  stats: {
    sessionsCompleted: number;
    minutesStudied: number;
    xpEarned: number;
    topTracks: string[];  // track ids, up to 3
  };
}
