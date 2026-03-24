import { getDocData, updateDocData } from "../services/firestore.service";
import type { UserProfile, AchievementId } from "../models/user";

export type AchievementDef = {
  id: AchievementId;
  icon: string;
  titleKey: string; // i18n key
};

export const ACHIEVEMENTS: AchievementDef[] = [
  // First
  { id: "first_session",    icon: "🎯", titleKey: "achievements.first_session" },
  // Streak
  { id: "streak_3",         icon: "🔥", titleKey: "achievements.streak_3" },
  { id: "streak_7",         icon: "⚡", titleKey: "achievements.streak_7" },
  { id: "streak_30",        icon: "🏆", titleKey: "achievements.streak_30" },
  { id: "streak_60",        icon: "💥", titleKey: "achievements.streak_60" },
  { id: "streak_100",       icon: "👑", titleKey: "achievements.streak_100" },
  { id: "streak_365",       icon: "🌟", titleKey: "achievements.streak_365" },
  // Perfect quiz
  { id: "perfect_quiz",     icon: "💯", titleKey: "achievements.perfect_quiz" },
  { id: "perfect_quiz_3",   icon: "🎖️",  titleKey: "achievements.perfect_quiz_3" },
  { id: "perfect_quiz_10",  icon: "🔮", titleKey: "achievements.perfect_quiz_10" },
  // Sessions
  { id: "sessions_10",      icon: "📚", titleKey: "achievements.sessions_10" },
  { id: "sessions_50",      icon: "📖", titleKey: "achievements.sessions_50" },
  { id: "sessions_100",     icon: "🧠", titleKey: "achievements.sessions_100" },
  { id: "sessions_250",     icon: "🎓", titleKey: "achievements.sessions_250" },
  { id: "sessions_500",     icon: "🏅", titleKey: "achievements.sessions_500" },
  // Level
  { id: "level_5",          icon: "🚀", titleKey: "achievements.level_5" },
  { id: "level_10",         icon: "⭐", titleKey: "achievements.level_10" },
  { id: "level_20",         icon: "💎", titleKey: "achievements.level_20" },
  { id: "level_30",         icon: "🌙", titleKey: "achievements.level_30" },
  { id: "level_50",         icon: "☀️",  titleKey: "achievements.level_50" },
  // SM-2 reviews
  { id: "reviews_first",    icon: "🔁", titleKey: "achievements.reviews_first" },
  { id: "reviews_50",       icon: "🔄", titleKey: "achievements.reviews_50" },
  { id: "reviews_500",      icon: "♾️",  titleKey: "achievements.reviews_500" },
];

/**
 * Checks which achievements were newly unlocked after a session or review.
 * Returns list of newly unlocked achievement IDs.
 */
export async function checkAndGrantAchievements(
  uid: string,
  sessionContext: { quizScore: number },
): Promise<AchievementId[]> {
  const user = await getDocData<UserProfile>(`users/${uid}`);
  if (!user) return [];

  const existing = user.achievements ?? {};
  const streak = user.streak?.current ?? 0;
  const totalSessions = user.totalSessions ?? 0;
  const level = user.level ?? 1;
  const totalPerfectQuizzes = user.totalPerfectQuizzes ?? 0;
  const consecutivePerfectQuizzes = user.consecutivePerfectQuizzes ?? 0;
  const totalCardsReviewed = user.totalCardsReviewed ?? 0;

  const candidates: { id: AchievementId; condition: boolean }[] = [
    { id: "first_session",   condition: true },
    // Streak
    { id: "streak_3",        condition: streak >= 3 },
    { id: "streak_7",        condition: streak >= 7 },
    { id: "streak_30",       condition: streak >= 30 },
    { id: "streak_60",       condition: streak >= 60 },
    { id: "streak_100",      condition: streak >= 100 },
    { id: "streak_365",      condition: streak >= 365 },
    // Perfect quiz
    { id: "perfect_quiz",    condition: sessionContext.quizScore >= 1 },
    { id: "perfect_quiz_3",  condition: consecutivePerfectQuizzes >= 3 },
    { id: "perfect_quiz_10", condition: totalPerfectQuizzes >= 10 },
    // Sessions
    { id: "sessions_10",     condition: totalSessions >= 10 },
    { id: "sessions_50",     condition: totalSessions >= 50 },
    { id: "sessions_100",    condition: totalSessions >= 100 },
    { id: "sessions_250",    condition: totalSessions >= 250 },
    { id: "sessions_500",    condition: totalSessions >= 500 },
    // Level
    { id: "level_5",         condition: level >= 5 },
    { id: "level_10",        condition: level >= 10 },
    { id: "level_20",        condition: level >= 20 },
    { id: "level_30",        condition: level >= 30 },
    { id: "level_50",        condition: level >= 50 },
    // SM-2 reviews
    { id: "reviews_first",   condition: totalCardsReviewed >= 1 },
    { id: "reviews_50",      condition: totalCardsReviewed >= 50 },
    { id: "reviews_500",     condition: totalCardsReviewed >= 500 },
  ];

  const unlocked: AchievementId[] = [];
  const newEntries: Partial<Record<AchievementId, number>> = {};

  for (const { id, condition } of candidates) {
    if (condition && !existing[id]) {
      unlocked.push(id);
      newEntries[id] = Date.now();
    }
  }

  if (unlocked.length > 0) {
    await updateDocData<UserProfile>(`users/${uid}`, {
      achievements: { ...existing, ...newEntries },
    });
  }

  return unlocked;
}
