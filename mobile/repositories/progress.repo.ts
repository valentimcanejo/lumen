import {
  collection,
  getDocs,
  query,
  orderBy,
  where,
  limit as fbLimit,
  doc,
  setDoc,
  updateDoc,
  increment,
} from "firebase/firestore";
import { db } from "../firebase/firebaseConfig";
import {
  setDocData,
  getDocData,
  updateDocData,
} from "../services/firestore.service";
import type { UserProfile, AchievementId } from "../models/user";
import { xpToLevel } from "../models/user";
import { getMissionsForDate, WEEKLY_MISSIONS_DEFAULT } from "./missions.repo";
import { getCurrentWeekId } from "./leaderboard.repo";
import type { WeeklyMission, WeeklyMissionId } from "../models/user";
import { computeNewAchievements } from "./achievements.repo";
import type { Lang } from "../models/lang";

export type CompletedSession = {
  date: string; // YYYY-MM-DD
  contentId: string;
  contentVersion: number;
  minutes: number;
  quizScore: number;
  completedAt: number;
};

export type DayData = {
  date: string; // YYYY-MM-DD
  minutes: number;
};

// Doc ID: "{date}_{contentId}" — supports multiple sessions per day
function userDailyPath(uid: string, date: string, contentId: string) {
  return `users/${uid}/daily_sessions/${date}_${contentId}`;
}

export async function getTodaySession(uid: string): Promise<CompletedSession | null> {
  const today = ymd(new Date());
  const q = query(
    collection(db, "users", uid, "daily_sessions"),
    where("date", "==", today),
    fbLimit(1),
  );
  const snap = await getDocs(q);
  if (snap.empty) return null;
  return snap.docs[0].data() as CompletedSession;
}

export async function getRecentSessions(
  uid: string,
  count = 5,
): Promise<CompletedSession[]> {
  const q = query(
    collection(db, "users", uid, "daily_sessions"),
    orderBy("completedAt", "desc"),
    fbLimit(count),
  );
  const snap = await getDocs(q);
  return snap.docs.map((d) => d.data() as CompletedSession);
}

function ymd(d: Date): string {
  const yyyy = d.getFullYear();
  const mm = String(d.getMonth() + 1).padStart(2, "0");
  const dd = String(d.getDate()).padStart(2, "0");
  return `${yyyy}-${mm}-${dd}`;
}

export async function getWeeklyMinutes(uid: string): Promise<number> {
  const data = await getWeeklyData(uid);
  return data.reduce((sum, d) => sum + d.minutes, 0);
}

/** Returns Mon–Sun data for the current week */
export async function getWeeklyData(uid: string): Promise<DayData[]> {
  const today = new Date();
  const dow = today.getDay(); // 0=Sun
  const monday = new Date(today);
  monday.setDate(today.getDate() - (dow === 0 ? 6 : dow - 1));

  const dates = Array.from({ length: 7 }, (_, i) => {
    const d = new Date(monday);
    d.setDate(monday.getDate() + i);
    return ymd(d);
  });

  const q = query(
    collection(db, "users", uid, "daily_sessions"),
    where("date", ">=", dates[0]),
    where("date", "<=", dates[6]),
  );
  const snap = await getDocs(q);

  const minutesByDate: Record<string, number> = {};
  for (const doc of snap.docs) {
    const s = doc.data() as CompletedSession;
    minutesByDate[s.date] = (minutesByDate[s.date] ?? 0) + s.minutes;
  }

  return dates.map((date) => ({ date, minutes: minutesByDate[date] ?? 0 }));
}

/**
 * Returns a map of { [YYYY-MM-DD]: totalMinutes } for the last `weeks` weeks.
 * Used to render the activity heatmap on the profile screen.
 */
export async function getStudyHeatmap(
  uid: string,
  weeks = 16,
): Promise<Record<string, number>> {
  const today = new Date();
  // Anchor start to the Monday of the week `weeks` ago
  const dow = today.getDay(); // 0=Sun
  const monday = new Date(today);
  monday.setDate(today.getDate() - (dow === 0 ? 6 : dow - 1) - (weeks - 1) * 7);
  monday.setHours(0, 0, 0, 0);

  const startDate = ymd(monday);
  const endDate = ymd(today);

  const q = query(
    collection(db, "users", uid, "daily_sessions"),
    where("date", ">=", startDate),
    where("date", "<=", endDate),
  );
  const snap = await getDocs(q);

  const result: Record<string, number> = {};
  for (const d of snap.docs) {
    const s = d.data() as CompletedSession;
    result[s.date] = (result[s.date] ?? 0) + s.minutes;
  }
  return result;
}

type CardGrade = "know" | "almost" | "dont";

// Each graded card is its own document.
// Path: users/{uid}/card_progress/{contentId}_{cardId}
// This allows server-side queries (nextReviewAt <= now) and avoids the
// 1MB per-doc limit that the old map structure would hit at scale.
type CardProgressDoc = {
  contentId: string;
  cardId: string;
  grade: CardGrade;
  updatedAt: number;
  interval: number;      // days until next review
  easeFactor: number;    // SM-2 ease factor (starts at 2.5)
  nextReviewAt: number;  // timestamp ms
  reviewCount: number;
  version: number;
  lang: Lang;
};

export type DueCard = {
  contentId: string;
  cardId: string;
  version: number;
  lang: Lang;
  nextReviewAt: number;
};

function cardProgressPath(uid: string, contentId: string, cardId: string) {
  return `users/${uid}/card_progress/${contentId}_${cardId}`;
}

function computeSM2(
  grade: CardGrade,
  prev: Partial<CardProgressDoc>,
): Pick<CardProgressDoc, "interval" | "easeFactor" | "nextReviewAt" | "reviewCount"> {
  const quality = grade === "know" ? 5 : grade === "almost" ? 3 : 1;
  const prevInterval = prev.interval ?? 1;
  const prevEF = prev.easeFactor ?? 2.5;
  const prevReviewCount = prev.reviewCount ?? 0;

  let interval: number;
  let easeFactor: number;

  if (quality < 3) {
    interval = 1;
    easeFactor = prevEF;
  } else {
    if (prevReviewCount === 0) interval = 1;
    else if (prevReviewCount === 1) interval = 6;
    else interval = Math.round(prevInterval * prevEF);
    easeFactor = Math.max(
      1.3,
      prevEF + 0.1 - (5 - quality) * (0.08 + (5 - quality) * 0.02),
    );
  }

  return {
    interval,
    easeFactor,
    reviewCount: prevReviewCount + 1,
    nextReviewAt: Date.now() + interval * 24 * 60 * 60 * 1000,
  };
}

export async function gradeCard(
  uid: string,
  contentId: string,
  cardId: string,
  grade: CardGrade,
  meta?: { version: number; lang: Lang },
) {
  const path = cardProgressPath(uid, contentId, cardId);
  const prev = (await getDocData<CardProgressDoc>(path)) ?? {};
  const sm2 = computeSM2(grade, prev);

  await setDocData<CardProgressDoc>(path, {
    contentId,
    cardId,
    grade,
    updatedAt: Date.now(),
    ...sm2,
    version: meta?.version ?? prev.version ?? 1,
    lang: meta?.lang ?? prev.lang ?? "pt",
  });
}

// Server-side query — single round-trip regardless of how many packs exist.
// Requires the Firestore single-field index on nextReviewAt (auto-created).
export async function getDueCards(uid: string): Promise<DueCard[]> {
  const now = Date.now();
  const q = query(
    collection(db, "users", uid, "card_progress"),
    where("nextReviewAt", "<=", now),
    orderBy("nextReviewAt", "asc"),
  );
  const snap = await getDocs(q);
  return snap.docs.map((d) => {
    const data = d.data() as CardProgressDoc;
    return {
      contentId: data.contentId,
      cardId: data.cardId,
      version: data.version ?? 1,
      lang: data.lang ?? "pt",
      nextReviewAt: data.nextReviewAt,
    };
  });
}

export async function getDueCardCount(uid: string): Promise<number> {
  const due = await getDueCards(uid);
  return due.length;
}

export async function markDayCompleted(
  uid: string,
  date: string,
  payload: {
    contentId: string;
    contentVersion: number;
    minutes: number;
    quizScore: number;
  },
) {
  await setDocData(userDailyPath(uid, date, payload.contentId), {
    date,
    ...payload,
    completedAt: Date.now(),
  });

  // Monthly rollup — users/{uid}/stats/monthly_{YYYY-MM}
  // Lets profile/analytics show "X minutes this month" without scanning daily_sessions.
  const month = date.slice(0, 7); // "YYYY-MM"
  await setDoc(
    doc(db, "users", uid, "stats", `monthly_${month}`),
    {
      month,
      minutes: increment(payload.minutes),
      sessions: increment(1),
      updatedAt: Date.now(),
    },
    { merge: true },
  );
}

export async function updateStreak(uid: string, date: string) {
  const user = await getDocData<UserProfile>(`users/${uid}`);
  if (!user) return;

  const last = user.streak?.lastStudyDate;

  const toNum = (d: string) => Number(d.replaceAll("-", ""));
  const todayN = toNum(date);
  const lastN = last ? toNum(last) : 0;

  let current = user.streak?.current ?? 0;
  let best = user.streak?.best ?? 0;
  let shields = user.streak?.shields ?? 0;

  if (last === date) {
    // nada
  } else if (!last || todayN === lastN + 1) {
    current = current + 1;
  } else {
    if (shields > 0) shields -= 1;
    else current = 1;
  }

  best = Math.max(best, current);

  await updateDocData<UserProfile>(`users/${uid}`, {
    streak: { current, best, shields, lastStudyDate: date },
    updatedAt: Date.now(),
  });
}

/**
 * Awards XP for a completed session. Returns new xp, level, and XP breakdown.
 * quizDone: false means quiz was skipped — does not affect perfect quiz streak.
 */
export async function grantSessionXP(
  uid: string,
  quizScore: number,
  options: { quizDone?: boolean } = {},
): Promise<{ xp: number; level: number; gained: number; base: number; quizBonus: number }> {
  const { quizDone = true } = options;
  const base = 10;
  const quizBonus = Math.round(quizScore * 10); // 0–10 XP
  const gained = base + quizBonus;

  const user = await getDocData<UserProfile>(`users/${uid}`);
  const currentXp = user?.xp ?? 0;
  const newXp = currentXp + gained;
  const newLevel = xpToLevel(newXp);
  const totalSessions = (user?.totalSessions ?? 0) + 1;

  // Track perfect quiz streaks (only when quiz was actually done)
  const isPerfect = quizDone && quizScore >= 1.0;
  const prevConsecutive = user?.consecutivePerfectQuizzes ?? 0;
  const prevTotalPerfect = user?.totalPerfectQuizzes ?? 0;
  const newConsecutive = quizDone ? (isPerfect ? prevConsecutive + 1 : 0) : prevConsecutive;
  const newTotalPerfect = isPerfect ? prevTotalPerfect + 1 : prevTotalPerfect;

  await updateDocData<UserProfile>(`users/${uid}`, {
    xp: newXp,
    level: newLevel,
    totalSessions,
    consecutivePerfectQuizzes: newConsecutive,
    totalPerfectQuizzes: newTotalPerfect,
    updatedAt: Date.now(),
  });

  return { xp: newXp, level: newLevel, gained, base, quizBonus };
}

/** Increments the total SM-2 cards reviewed counter on the user doc. */
export async function incrementCardsReviewed(uid: string, count: number): Promise<void> {
  if (count <= 0) return;
  await updateDoc(doc(db, "users", uid), {
    totalCardsReviewed: increment(count),
    updatedAt: Date.now(),
  });
}

export type FinishSessionResult = {
  gained: number;
  base: number;
  quizBonus: number;
  missionBonus: number;
  weeklyMissionBonus: number;
  starterBonus: number;
  starterDaysCompleted: number; // 0-3
  newWeeklyMissionIds: WeeklyMissionId[];
  newAchievementIds: AchievementId[];
  leveledUp: boolean;
  newLevel: number;
  prevLevel: number;
  shieldEarned: boolean;
  newStreak: number;
};

/**
 * Completes a session with a single Firestore read + single write on users/{uid}.
 * Computes streak, XP, missions and achievements in memory, then flushes all at once.
 * Use this in summary.tsx instead of calling updateStreak / grantSessionXP /
 * checkAndCompleteDailyMissions / checkAndGrantAchievements individually.
 */
export async function finishSession(
  uid: string,
  context: { date: string; contentId: string; quizScore: number; quizDone: boolean; completedTrackCount?: number; totalTrackCount?: number },
): Promise<FinishSessionResult> {
  const { date, contentId, quizScore, quizDone, completedTrackCount = 0, totalTrackCount = Infinity } = context;

  // ── Idempotency guard ─────────────────────────────────────────────────────
  // IMPORTANT: summary.tsx must await finishSession BEFORE calling markDayCompleted
  // so this read happens before markDayCompleted writes to the same path.
  const existingSession = await getDocData<CompletedSession>(userDailyPath(uid, date, contentId));
  if (existingSession) {
    const level = (await getDocData<UserProfile>(`users/${uid}`))?.level ?? 1;
    return { gained: 0, base: 0, quizBonus: 0, missionBonus: 0, weeklyMissionBonus: 0, starterBonus: 0, starterDaysCompleted: 0, newWeeklyMissionIds: [], newAchievementIds: [], leveledUp: false, newLevel: level, prevLevel: level, shieldEarned: false, newStreak: 0 };
  }

  const user = await getDocData<UserProfile>(`users/${uid}`);
  if (!user) return { gained: 0, base: 0, quizBonus: 0, missionBonus: 0, weeklyMissionBonus: 0, starterBonus: 0, starterDaysCompleted: 0, newWeeklyMissionIds: [], newAchievementIds: [], leveledUp: false, newLevel: 1, prevLevel: 1, shieldEarned: false, newStreak: 0 };

  const prevLevel = user.level ?? 1;

  // ── Streak ──────────────────────────────────────────────────────────────
  const last = user.streak?.lastStudyDate;
  const toNum = (d: string) => Number(d.replaceAll("-", ""));
  const todayN = toNum(date);
  const lastN = last ? toNum(last) : 0;
  const prevStreakCurrent = user.streak?.current ?? 0;
  let streakCurrent = prevStreakCurrent;
  let shields = user.streak?.shields ?? 0;

  if (last === date) { /* already counted today */ }
  else if (!last || todayN === lastN + 1) { streakCurrent += 1; }
  else if (shields > 0) { shields -= 1; }
  else { streakCurrent = 1; }

  // Award a shield on every 7-day milestone (max 3)
  let shieldEarned = false;
  if (last !== date && streakCurrent > prevStreakCurrent && streakCurrent % 7 === 0) {
    shields = Math.min(shields + 1, 3);
    shieldEarned = true;
  }

  const streakBest = Math.max(user.streak?.best ?? 0, streakCurrent);

  // ── Quiz streak (dias consecutivos com score ≥ 80%) ─────────────────────
  const toNumQ = toNum; // reuse helper
  const lastGoodQuizDate = user.lastGoodQuizDate;
  let consecutiveGoodQuizDays = user.consecutiveGoodQuizDays ?? 0;
  let newLastGoodQuizDate = lastGoodQuizDate;

  if (quizDone) {
    if (quizScore >= 0.8) {
      if (lastGoodQuizDate === date) {
        // same day — no change
      } else if (!lastGoodQuizDate || toNumQ(date) === toNumQ(lastGoodQuizDate) + 1) {
        consecutiveGoodQuizDays += 1;
      } else {
        consecutiveGoodQuizDays = 1;
      }
      newLastGoodQuizDate = date;
    } else {
      // quiz done but < 80% — reset streak
      consecutiveGoodQuizDays = 0;
    }
  }
  // quiz skipped — preserve streak unchanged

  // ── XP ──────────────────────────────────────────────────────────────────
  const base = 10;
  const quizBonus = Math.round(quizScore * 10);
  const isPerfect = quizDone && quizScore >= 1.0;
  const prevConsecutive = user.consecutivePerfectQuizzes ?? 0;
  const newConsecutive = quizDone ? (isPerfect ? prevConsecutive + 1 : 0) : prevConsecutive;
  const newTotalPerfect = (user.totalPerfectQuizzes ?? 0) + (isPerfect ? 1 : 0);
  const totalSessions = (user.totalSessions ?? 0) + 1;

  // ── Missions ─────────────────────────────────────────────────────────────
  const cm = user.currentMissions;
  const missionList = cm?.date === date
    ? cm.list.map((m) => ({ ...m }))
    : getMissionsForDate(date);

  let missionBonus = 0;
  for (const mission of missionList) {
    if (mission.completed) continue;
    let done = false;
    switch (mission.id) {
      case "complete_session": done = true; break;
      case "quiz_score_80":    done = quizDone && quizScore >= 0.8; break;
      case "quiz_score_100":   done = quizDone && quizScore >= 1.0; break;
    }
    if (done) { mission.completed = true; missionBonus += mission.xpReward; }
  }

  // ── Weekly missions ───────────────────────────────────────────────────────
  const weekId = getCurrentWeekId();
  const cwm = user.currentWeeklyMissions;
  const weeklyList: WeeklyMission[] = cwm?.weekId === weekId
    ? cwm.list.map((m) => ({ ...m }))
    : WEEKLY_MISSIONS_DEFAULT.map((m) => ({ ...m }));

  // Track unique study days this week to power the "study_3_days" mission
  const weeklyStudyDates: string[] = cwm?.weekId === weekId
    ? [...(cwm.studyDates ?? [])]
    : [];
  if (!weeklyStudyDates.includes(date)) weeklyStudyDates.push(date);

  let weeklyMissionBonus = 0;
  const newWeeklyMissionIds: WeeklyMissionId[] = [];

  for (const m of weeklyList) {
    if (m.completed) continue;
    switch (m.id) {
      case "complete_5_sessions":
        m.progress = Math.min(m.progress + 1, m.target);
        break;
      case "earn_300_xp":
        m.progress = Math.min(m.progress + base + quizBonus + missionBonus, m.target);
        break;
      case "perfect_quiz":
        if (isPerfect) m.progress = 1;
        break;
      case "study_3_days":
        m.progress = Math.min(weeklyStudyDates.length, m.target);
        break;
    }
    if (m.progress >= m.target) {
      m.completed = true;
      m.progress = m.target;
      newWeeklyMissionIds.push(m.id);
      weeklyMissionBonus += m.xpReward;
    }
  }

  // ── Starter challenge — first 3 unique study days ────────────────────────
  const STARTER_BONUS_XP = 50;
  const STARTER_WINDOW_DAYS = 30; // show challenge for up to 30 days after account creation
  const accountAgeDays = (Date.now() - (user.createdAt ?? 0)) / 86_400_000;
  const sc = user.starterChallenge ?? { studyDates: [], bonusGranted: false };
  const scDates = sc.studyDates.includes(date) ? sc.studyDates : [...sc.studyDates, date];
  const scDatesLimited = scDates.slice(0, 3); // cap at 3
  const starterDaysCompleted = scDatesLimited.length;
  let starterBonus = 0;
  const justCompletedChallenge =
    starterDaysCompleted >= 3 && !sc.bonusGranted && accountAgeDays <= STARTER_WINDOW_DAYS;
  if (justCompletedChallenge) starterBonus = STARTER_BONUS_XP;

  // ── Total XP + level ─────────────────────────────────────────────────────
  const gained = base + quizBonus;
  const newXp = (user.xp ?? 0) + gained + missionBonus + weeklyMissionBonus + starterBonus;
  const newLevel = xpToLevel(newXp);

  // ── Achievements (computed against updated state) ─────────────────────────
  const updatedUser: UserProfile = {
    ...user,
    streak: { current: streakCurrent, best: streakBest, shields, lastStudyDate: date },
    xp: newXp,
    level: newLevel,
    totalSessions,
    consecutivePerfectQuizzes: newConsecutive,
    totalPerfectQuizzes: newTotalPerfect,
    consecutiveGoodQuizDays,
  };
  const { ids: newAchievementIds, entries: achievementEntries } =
    computeNewAchievements(updatedUser, quizScore, { completedTrackCount, totalTrackCount, shieldEarned });

  // ── Single write ─────────────────────────────────────────────────────────
  await updateDocData<UserProfile>(`users/${uid}`, {
    streak: { current: streakCurrent, best: streakBest, shields, lastStudyDate: date },
    xp: newXp,
    level: newLevel,
    totalSessions,
    consecutivePerfectQuizzes: newConsecutive,
    totalPerfectQuizzes: newTotalPerfect,
    consecutiveGoodQuizDays,
    ...(newLastGoodQuizDate !== undefined && { lastGoodQuizDate: newLastGoodQuizDate }),
    currentMissions: { date, list: missionList },
    currentWeeklyMissions: { weekId, list: weeklyList, studyDates: weeklyStudyDates },
    starterChallenge: { studyDates: scDatesLimited, bonusGranted: sc.bonusGranted || justCompletedChallenge },
    ...(newAchievementIds.length > 0 && {
      achievements: { ...(user.achievements ?? {}), ...achievementEntries },
    }),
    updatedAt: Date.now(),
  });

  return { gained, base, quizBonus, missionBonus, weeklyMissionBonus, starterBonus, starterDaysCompleted, newWeeklyMissionIds, newAchievementIds, leveledUp: newLevel > prevLevel, newLevel, prevLevel, shieldEarned, newStreak: streakCurrent };
}

// ---------------------------------------------------------------------------
// Comeback mechanic — grants +1 streak shield (max 3) when returning after 3+ days
// ---------------------------------------------------------------------------

export async function grantComebackShield(uid: string): Promise<void> {
  const user = await getDocData<UserProfile>(`users/${uid}`);
  if (!user) return;
  const current = user.streak?.shields ?? 0;
  if (current >= 3) return;
  await updateDoc(doc(db, "users", uid), {
    "streak.shields": Math.min(current + 1, 3),
    updatedAt: Date.now(),
  });
}
