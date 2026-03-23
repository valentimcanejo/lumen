import {
  collection,
  getDocs,
  query,
  orderBy,
  where,
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
  count = 20,
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

type CardGrade = "know" | "almost" | "dont";

type CardProgressEntry = {
  grade: CardGrade;
  updatedAt: number;
  interval: number;      // days until next review
  easeFactor: number;    // SM-2 ease factor (starts at 2.5)
  nextReviewAt: number;  // timestamp ms
  reviewCount: number;
  version: number;
  lang: string;
};

export type DueCard = {
  contentId: string;
  cardId: string;
  version: number;
  lang: Lang;
  nextReviewAt: number;
};

function computeSM2(
  grade: CardGrade,
  prev: Partial<CardProgressEntry>,
): Pick<CardProgressEntry, "interval" | "easeFactor" | "nextReviewAt" | "reviewCount"> {
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
  const doc = await getDocData<Record<string, CardProgressEntry>>(
    `users/${uid}/card_progress/${contentId}`,
  );
  const prev = doc?.[cardId] ?? {};
  const sm2 = computeSM2(grade, prev);

  await setDocData(`users/${uid}/card_progress/${contentId}`, {
    [cardId]: {
      grade,
      updatedAt: Date.now(),
      ...sm2,
      version: meta?.version ?? (prev as CardProgressEntry).version ?? 1,
      lang: meta?.lang ?? (prev as CardProgressEntry).lang ?? "pt",
    },
  });
}

export async function getDueCards(uid: string): Promise<DueCard[]> {
  const snap = await getDocs(collection(db, "users", uid, "card_progress"));
  const due: DueCard[] = [];
  const now = Date.now();
  for (const docSnap of snap.docs) {
    const contentId = docSnap.id;
    const data = docSnap.data() as Record<string, CardProgressEntry>;
    for (const [cardId, entry] of Object.entries(data)) {
      if (entry.nextReviewAt && entry.nextReviewAt <= now) {
        due.push({
          contentId,
          cardId,
          version: entry.version ?? 1,
          lang: (entry.lang ?? "pt") as Lang,
          nextReviewAt: entry.nextReviewAt,
        });
      }
    }
  }
  return due.sort((a, b) => a.nextReviewAt - b.nextReviewAt);
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
