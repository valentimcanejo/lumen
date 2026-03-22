import {
  collection,
  getDocs,
  query,
  orderBy,
  limit as fbLimit,
} from "firebase/firestore";
import { db } from "../firebase/firebaseConfig";
import {
  setDocData,
  getDocData,
  updateDocData,
} from "../services/firestore.service";
import type { UserProfile } from "../models/user";
import { xpToLevel } from "../models/user";

export type CompletedSession = {
  date: string; // YYYY-MM-DD (document ID)
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

export async function getRecentSessions(
  uid: string,
  count = 20,
): Promise<CompletedSession[]> {
  const q = query(
    collection(db, "users", uid, "daily_sessions"),
    orderBy("completedAt", "desc"),
    fbLimit(count),
  );
  const snap = await getDocs(q);
  return snap.docs.map((d) => ({
    date: d.id,
    ...(d.data() as Omit<CompletedSession, "date">),
  }));
}

function userDailyPath(uid: string, date: string) {
  return `users/${uid}/daily_sessions/${date}`;
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

  const sessions = await Promise.all(
    dates.map((date) => getDocData<{ minutes: number }>(userDailyPath(uid, date))),
  );

  return dates.map((date, i) => ({ date, minutes: sessions[i]?.minutes ?? 0 }));
}

type CardGrade = "know" | "almost" | "dont";

export async function gradeCard(
  uid: string,
  contentId: string,
  cardId: string,
  grade: CardGrade,
) {
  await setDocData(`users/${uid}/card_progress/${contentId}`, {
    [cardId]: { grade, updatedAt: Date.now() },
  });
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
  await setDocData(userDailyPath(uid, date), {
    ...payload,
    completedAt: Date.now(),
  });
}

export async function updateStreak(uid: string, date: string) {
  const user = await getDocData<UserProfile>(`users/${uid}`);
  if (!user) return;

  const last = user.streak.lastStudyDate;

  const toNum = (d: string) => Number(d.replaceAll("-", ""));
  const todayN = toNum(date);
  const lastN = last ? toNum(last) : 0;

  let current = user.streak.current ?? 0;
  let best = user.streak.best ?? 0;
  let shields = user.streak.shields ?? 0;

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

/** Awards XP for a completed session. Returns new xp and level. */
export async function grantSessionXP(
  uid: string,
  quizScore: number,
): Promise<{ xp: number; level: number; gained: number }> {
  const gained = 10 + Math.round(quizScore * 10); // 10–20 XP per session
  const user = await getDocData<UserProfile>(`users/${uid}`);
  const currentXp = user?.xp ?? 0;
  const newXp = currentXp + gained;
  const newLevel = xpToLevel(newXp);
  const totalSessions = (user?.totalSessions ?? 0) + 1;

  await updateDocData<UserProfile>(`users/${uid}`, {
    xp: newXp,
    level: newLevel,
    totalSessions,
    updatedAt: Date.now(),
  });

  return { xp: newXp, level: newLevel, gained };
}
