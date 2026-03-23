import { doc, setDoc, increment, getDoc } from "firebase/firestore";
import { db } from "../firebase/firebaseConfig";

// Collection: content_stats/{contentId}
// Updated atomically via Firestore increment — safe under concurrent writes.
//
// avgScore  = totalScore  / completions  (compute at read time)
// avgMinutes = totalMinutes / completions  (compute at read time)

export type ContentStats = {
  starts: number;
  completions: number;
  totalScore: number;    // sum of quiz scores (0–1 each)
  totalMinutes: number;
  updatedAt: number;
};

export type ContentStatsComputed = ContentStats & {
  avgScore: number;
  avgMinutes: number;
  completionRate: number;
};

function statsPath(contentId: string) {
  return doc(db, "content_stats", contentId);
}

export async function incrementContentStart(contentId: string): Promise<void> {
  await setDoc(statsPath(contentId), {
    starts: increment(1),
    updatedAt: Date.now(),
  }, { merge: true });
}

export async function incrementContentCompletion(
  contentId: string,
  quizScore: number,
  minutes: number,
): Promise<void> {
  await setDoc(statsPath(contentId), {
    completions: increment(1),
    totalScore: increment(quizScore),
    totalMinutes: increment(minutes),
    updatedAt: Date.now(),
  }, { merge: true });
}

export async function getContentStats(contentId: string): Promise<ContentStatsComputed | null> {
  const snap = await getDoc(statsPath(contentId));
  if (!snap.exists()) return null;
  const data = snap.data() as ContentStats;
  const c = data.completions || 1; // avoid div/0
  return {
    ...data,
    avgScore: data.totalScore / c,
    avgMinutes: data.totalMinutes / c,
    completionRate: data.starts > 0 ? data.completions / data.starts : 0,
  };
}
