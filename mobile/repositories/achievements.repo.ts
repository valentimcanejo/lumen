import { getDocData, updateDocData } from "../services/firestore.service";
import type { UserProfile, AchievementId } from "../models/user";

export type AchievementDef = {
  id: AchievementId;
  icon: string;
  titleKey: string; // i18n key
};

export const ACHIEVEMENTS: AchievementDef[] = [
  { id: "first_session", icon: "🎯", titleKey: "achievements.first_session" },
  { id: "streak_3",      icon: "🔥", titleKey: "achievements.streak_3" },
  { id: "streak_7",      icon: "⚡", titleKey: "achievements.streak_7" },
  { id: "streak_30",     icon: "🏆", titleKey: "achievements.streak_30" },
  { id: "perfect_quiz",  icon: "💯", titleKey: "achievements.perfect_quiz" },
  { id: "sessions_10",   icon: "📚", titleKey: "achievements.sessions_10" },
  { id: "sessions_50",   icon: "🌟", titleKey: "achievements.sessions_50" },
  { id: "level_5",       icon: "🚀", titleKey: "achievements.level_5" },
];

/**
 * Checks which achievements were newly unlocked after a session.
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

  const candidates: { id: AchievementId; condition: boolean }[] = [
    { id: "first_session", condition: true },
    { id: "streak_3",      condition: streak >= 3 },
    { id: "streak_7",      condition: streak >= 7 },
    { id: "streak_30",     condition: streak >= 30 },
    { id: "perfect_quiz",  condition: sessionContext.quizScore >= 1 },
    { id: "sessions_10",   condition: totalSessions >= 10 },
    { id: "sessions_50",   condition: totalSessions >= 50 },
    { id: "level_5",       condition: level >= 5 },
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
