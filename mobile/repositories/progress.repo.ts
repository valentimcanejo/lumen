import {
  setDocData,
  getDocData,
  updateDocData,
} from "../services/firestore.service";
import type { UserProfile } from "../models/user";

function userDailyPath(uid: string, date: string) {
  return `users/${uid}/daily_sessions/${date}`;
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

  // helper compare YYYY-MM-DD
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
