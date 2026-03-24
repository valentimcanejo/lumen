import { getDocData, updateDocData } from "../services/firestore.service";
import type { UserProfile, AchievementId } from "../models/user";

export type AchievementDef = {
  id: AchievementId;
  icon: string;
  titleKey: string; // i18n key
};

export const ACHIEVEMENTS: AchievementDef[] = [
  // Sessões
  { id: "first_session",   icon: "🎯", titleKey: "achievements.first_session" },
  { id: "sessions_10",     icon: "📚", titleKey: "achievements.sessions_10" },
  { id: "sessions_50",     icon: "📖", titleKey: "achievements.sessions_50" },
  { id: "sessions_100",    icon: "🧠", titleKey: "achievements.sessions_100" },
  { id: "sessions_250",    icon: "🎓", titleKey: "achievements.sessions_250" },
  { id: "sessions_500",    icon: "🏅", titleKey: "achievements.sessions_500" },
  { id: "sessions_1000",   icon: "🌠", titleKey: "achievements.sessions_1000" },
  // Streak
  { id: "streak_3",        icon: "🔥", titleKey: "achievements.streak_3" },
  { id: "streak_7",        icon: "⚡", titleKey: "achievements.streak_7" },
  { id: "streak_30",       icon: "🏆", titleKey: "achievements.streak_30" },
  { id: "streak_60",       icon: "💥", titleKey: "achievements.streak_60" },
  { id: "streak_100",      icon: "👑", titleKey: "achievements.streak_100" },
  { id: "streak_200",      icon: "🌙", titleKey: "achievements.streak_200" },
  { id: "streak_365",      icon: "🌟", titleKey: "achievements.streak_365" },
  // Quiz perfeito (consecutivos)
  { id: "perfect_quiz",    icon: "💯", titleKey: "achievements.perfect_quiz" },
  { id: "perfect_quiz_3",  icon: "🎖️",  titleKey: "achievements.perfect_quiz_3" },
  { id: "perfect_quiz_5",  icon: "🎯", titleKey: "achievements.perfect_quiz_5" },
  { id: "perfect_quiz_10", icon: "🔮", titleKey: "achievements.perfect_quiz_10" },
  // Quiz streak (dias com ≥ 80%)
  { id: "quiz_streak_3",   icon: "📈", titleKey: "achievements.quiz_streak_3" },
  { id: "quiz_streak_7",   icon: "🎪", titleKey: "achievements.quiz_streak_7" },
  { id: "quiz_streak_14",  icon: "🧩", titleKey: "achievements.quiz_streak_14" },
  { id: "quiz_streak_30",  icon: "🏹", titleKey: "achievements.quiz_streak_30" },
  // Nível
  { id: "level_5",         icon: "🚀", titleKey: "achievements.level_5" },
  { id: "level_10",        icon: "⭐", titleKey: "achievements.level_10" },
  { id: "level_20",        icon: "💎", titleKey: "achievements.level_20" },
  { id: "level_30",        icon: "🌙", titleKey: "achievements.level_30" },
  { id: "level_50",        icon: "☀️",  titleKey: "achievements.level_50" },
  { id: "level_75",        icon: "🔱", titleKey: "achievements.level_75" },
  { id: "level_100",       icon: "🌌", titleKey: "achievements.level_100" },
  // Revisão SM-2
  { id: "reviews_first",   icon: "🔁", titleKey: "achievements.reviews_first" },
  { id: "reviews_50",      icon: "🔄", titleKey: "achievements.reviews_50" },
  { id: "reviews_200",     icon: "🔃", titleKey: "achievements.reviews_200" },
  { id: "reviews_500",     icon: "♾️",  titleKey: "achievements.reviews_500" },
  { id: "reviews_1000",    icon: "🧬", titleKey: "achievements.reviews_1000" },
  // Trilhas
  { id: "track_complete",  icon: "🗺️", titleKey: "achievements.track_complete" },
  { id: "tracks_3",        icon: "🌐", titleKey: "achievements.tracks_3" },
  { id: "tracks_all",      icon: "🏁", titleKey: "achievements.tracks_all" },
  // XP
  { id: "xp_100",          icon: "💰", titleKey: "achievements.xp_100" },
  { id: "xp_500",          icon: "💵", titleKey: "achievements.xp_500" },
  { id: "xp_1000",         icon: "💎", titleKey: "achievements.xp_1000" },
  { id: "xp_5000",         icon: "🏦", titleKey: "achievements.xp_5000" },
  // Shield
  { id: "first_shield",    icon: "🛡️", titleKey: "achievements.first_shield" },
  // Especial — desbloqueada ao completar todas as outras
  { id: "iluminado",       icon: "✨", titleKey: "achievements.iluminado" },
];

/**
 * Pure function — computes newly unlocked achievements given a user snapshot.
 * Does not read or write Firestore.
 */
export function computeNewAchievements(
  user: UserProfile,
  quizScore: number,
  opts: {
    completedTrackCount?: number;
    totalTrackCount?: number;
    shieldEarned?: boolean;
  } = {},
): { ids: AchievementId[]; entries: Partial<Record<AchievementId, number>> } {
  const existing = user.achievements ?? {};
  const streak = user.streak?.current ?? 0;
  const totalSessions = user.totalSessions ?? 0;
  const level = user.level ?? 1;
  const xp = user.xp ?? 0;
  const totalPerfectQuizzes = user.totalPerfectQuizzes ?? 0;
  const consecutivePerfectQuizzes = user.consecutivePerfectQuizzes ?? 0;
  const totalCardsReviewed = user.totalCardsReviewed ?? 0;
  const consecutiveGoodQuizDays = user.consecutiveGoodQuizDays ?? 0;
  const completedTrackCount = opts.completedTrackCount ?? 0;
  const totalTrackCount = opts.totalTrackCount ?? Infinity;
  const shieldEarned = opts.shieldEarned ?? false;

  const candidates: { id: AchievementId; condition: boolean }[] = [
    // Sessões
    { id: "first_session",   condition: true },
    { id: "sessions_10",     condition: totalSessions >= 10 },
    { id: "sessions_50",     condition: totalSessions >= 50 },
    { id: "sessions_100",    condition: totalSessions >= 100 },
    { id: "sessions_250",    condition: totalSessions >= 250 },
    { id: "sessions_500",    condition: totalSessions >= 500 },
    { id: "sessions_1000",   condition: totalSessions >= 1000 },
    // Streak
    { id: "streak_3",        condition: streak >= 3 },
    { id: "streak_7",        condition: streak >= 7 },
    { id: "streak_30",       condition: streak >= 30 },
    { id: "streak_60",       condition: streak >= 60 },
    { id: "streak_100",      condition: streak >= 100 },
    { id: "streak_200",      condition: streak >= 200 },
    { id: "streak_365",      condition: streak >= 365 },
    // Quiz perfeito
    { id: "perfect_quiz",    condition: quizScore >= 1 },
    { id: "perfect_quiz_3",  condition: consecutivePerfectQuizzes >= 3 },
    { id: "perfect_quiz_5",  condition: consecutivePerfectQuizzes >= 5 },
    { id: "perfect_quiz_10", condition: totalPerfectQuizzes >= 10 },
    // Quiz streak
    { id: "quiz_streak_3",   condition: consecutiveGoodQuizDays >= 3 },
    { id: "quiz_streak_7",   condition: consecutiveGoodQuizDays >= 7 },
    { id: "quiz_streak_14",  condition: consecutiveGoodQuizDays >= 14 },
    { id: "quiz_streak_30",  condition: consecutiveGoodQuizDays >= 30 },
    // Nível
    { id: "level_5",         condition: level >= 5 },
    { id: "level_10",        condition: level >= 10 },
    { id: "level_20",        condition: level >= 20 },
    { id: "level_30",        condition: level >= 30 },
    { id: "level_50",        condition: level >= 50 },
    { id: "level_75",        condition: level >= 75 },
    { id: "level_100",       condition: level >= 100 },
    // Revisão
    { id: "reviews_first",   condition: totalCardsReviewed >= 1 },
    { id: "reviews_50",      condition: totalCardsReviewed >= 50 },
    { id: "reviews_200",     condition: totalCardsReviewed >= 200 },
    { id: "reviews_500",     condition: totalCardsReviewed >= 500 },
    { id: "reviews_1000",    condition: totalCardsReviewed >= 1000 },
    // Trilhas
    { id: "track_complete",  condition: completedTrackCount >= 1 },
    { id: "tracks_3",        condition: completedTrackCount >= 3 },
    { id: "tracks_all",      condition: completedTrackCount > 0 && completedTrackCount >= totalTrackCount },
    // XP
    { id: "xp_100",          condition: xp >= 100 },
    { id: "xp_500",          condition: xp >= 500 },
    { id: "xp_1000",         condition: xp >= 1000 },
    { id: "xp_5000",         condition: xp >= 5000 },
    // Shield
    { id: "first_shield",    condition: shieldEarned },
  ];

  const ids: AchievementId[] = [];
  const entries: Partial<Record<AchievementId, number>> = {};
  for (const { id, condition } of candidates) {
    if (condition && !existing[id]) {
      ids.push(id);
      entries[id] = Date.now();
    }
  }

  // Iluminado — desbloqueada quando TODAS as outras são conquistadas
  if (!existing["iluminado"]) {
    const allOtherIds = ACHIEVEMENTS.filter((a) => a.id !== "iluminado").map((a) => a.id);
    const allUnlocked = allOtherIds.every((id) => existing[id] || ids.includes(id));
    if (allUnlocked) {
      ids.push("iluminado");
      entries["iluminado"] = Date.now();
    }
  }

  return { ids, entries };
}

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

  const { ids, entries } = computeNewAchievements(user, sessionContext.quizScore);

  if (ids.length > 0) {
    await updateDocData<UserProfile>(`users/${uid}`, {
      achievements: { ...(user.achievements ?? {}), ...entries },
    });
  }

  return ids;
}
