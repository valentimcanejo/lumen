import { db } from "../firebase/firebaseConfig";
import {
  doc,
  getDoc,
  setDoc,
  collection,
  query,
  orderBy,
  limit,
  getDocs,
  increment,
} from "firebase/firestore";
import type { LeaderboardEntry } from "../models/leaderboard";
import type { TierId } from "../models/user";

// ---------------------------------------------------------------------------
// Week ID — format "YYYY-WNN", anchored to Monday
// ---------------------------------------------------------------------------

export function getCurrentWeekId(date: Date = new Date()): string {
  const d = new Date(date);
  const dow = d.getDay();
  d.setDate(d.getDate() - (dow === 0 ? 6 : dow - 1));
  d.setHours(0, 0, 0, 0);

  const yyyy = d.getFullYear();
  const jan1 = new Date(yyyy, 0, 1);
  const week = Math.ceil(((d.getTime() - jan1.getTime()) / 86_400_000 + jan1.getDay() + 1) / 7);
  return `${yyyy}-W${String(week).padStart(2, "0")}`;
}

// ---------------------------------------------------------------------------
// Write — upsert current user's entry for their tier this week
// ---------------------------------------------------------------------------

export async function upsertLeaderboardEntry(
  uid: string,
  displayName: string,
  xpGained: number,
  level: number,
  tierId: TierId,
): Promise<void> {
  const weekId = getCurrentWeekId();
  const ref = doc(db, `leaderboard/${weekId}/${tierId}/${uid}`);
  await setDoc(
    ref,
    {
      uid,
      displayName,
      weekXp: increment(xpGained),
      level,
      updatedAt: Date.now(),
    },
    { merge: true },
  );
}

// ---------------------------------------------------------------------------
// Read — top 30 for a given tier and week
// ---------------------------------------------------------------------------

export async function getTopEntries(
  weekId: string,
  tierId: TierId,
): Promise<LeaderboardEntry[]> {
  const col = collection(db, `leaderboard/${weekId}/${tierId}`);
  const q = query(col, orderBy("weekXp", "desc"), limit(30));
  const snap = await getDocs(q);
  return snap.docs.map((d) => d.data() as LeaderboardEntry);
}

// ---------------------------------------------------------------------------
// Read — single entry for the current user
// ---------------------------------------------------------------------------

export async function getCurrentUserEntry(
  uid: string,
  weekId: string,
  tierId: TierId,
): Promise<LeaderboardEntry | null> {
  const ref = doc(db, `leaderboard/${weekId}/${tierId}/${uid}`);
  const snap = await getDoc(ref);
  return snap.exists() ? (snap.data() as LeaderboardEntry) : null;
}
