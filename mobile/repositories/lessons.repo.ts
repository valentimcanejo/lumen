import { collection, getDocs, query, where, orderBy } from "firebase/firestore";
import { db } from "../firebase/firebaseConfig";
import type { Lang } from "../models/lang";

export type LessonTier = "free" | "premium";
export type LessonStatus = "published" | "draft" | "archived";

export type LessonMeta = {
  id: string; // contentId — used to load the pack
  trackId: string;
  version: number;
  order: number;
  title: Partial<Record<Lang, string>>;
  estimatedMinutes: number;
  difficulty: 1 | 2 | 3;
  tier: LessonTier; // content gating
  status: LessonStatus; // visibility control
  prerequisites: string[]; // contentIds that must be completed first
};

// ---------------------------------------------------------------------------
// Module-level cache — populated once by initLessons() at app startup.
// Sync utility functions use this cache; they return empty results until
// initLessons() has resolved (which happens before the splash screen hides).
// ---------------------------------------------------------------------------

let _cache: LessonMeta[] | null = null;
let _initPromise: Promise<void> | null = null;

function _lessons(): LessonMeta[] {
  return _cache ?? [];
}

async function _fetchFromFirestore(): Promise<LessonMeta[]> {
  const q = query(collection(db, "lessons"), orderBy("order"));
  const snap = await getDocs(q);
  return snap.docs.map((d) => {
    const data = d.data();
    return {
      id: d.id,
      status: "published" as LessonStatus,
      tier: "free" as LessonTier,
      prerequisites: [] as string[],
      ...data,
    } as LessonMeta;
  });
}

/** Fetch lessons from Firestore and populate the in-memory cache.
 *  Called once in _layout.tsx; subsequent calls are no-ops. */
export function initLessons(): Promise<void> {
  if (_initPromise) return _initPromise;
  _initPromise = _fetchFromFirestore()
    .then((lessons) => { _cache = lessons; })
    .catch(() => { _cache = []; }); // fail-open: empty cache on network error
  return _initPromise;
}

// ---------------------------------------------------------------------------
// Sync utility functions (require initLessons() to have resolved)
// ---------------------------------------------------------------------------

export function getLessonMeta(contentId: string): LessonMeta | undefined {
  return _lessons().find((l) => l.id === contentId);
}

export function getLessonCountForTrack(trackId: string): number {
  return _lessons().filter((l) => l.trackId === trackId).length;
}

/** All published free lessons for the given tracks, sorted by track order
 *  then lesson order within track. */
function availableLessons(trackIds: string[]): LessonMeta[] {
  return _lessons()
    .filter(
      (l) =>
        trackIds.includes(l.trackId) &&
        l.status === "published" &&
        l.tier === "free",
    )
    .sort((a, b) => {
      const tA = trackIds.indexOf(a.trackId);
      const tB = trackIds.indexOf(b.trackId);
      return tA !== tB ? tA - tB : a.order - b.order;
    });
}

/** Returns the contentId of the next lesson the user should study.
 *  - Prefers the next uncompleted lesson in the same track as currentContentId.
 *  - Falls back to any uncompleted lesson across selected tracks.
 *  - Falls back to date-based rotation within the same track when all done. */
export function pickNextLesson(
  trackIds: string[],
  completedIds: string[],
  dateStr: string,
  currentContentId?: string,
): string | null {
  const lessons = availableLessons(trackIds);
  if (!lessons.length) return null;

  const currentTrackId = currentContentId
    ? _lessons().find((l) => l.id === currentContentId)?.trackId
    : undefined;

  const isReady = (l: LessonMeta) =>
    !completedIds.includes(l.id) &&
    l.prerequisites.every((p) => completedIds.includes(p));

  // 1. Next uncompleted in same track
  if (currentTrackId) {
    const sameTrackNext = lessons.find(
      (l) => l.trackId === currentTrackId && isReady(l),
    );
    if (sameTrackNext) return sameTrackNext.id;
  }

  // 2. Next uncompleted in any selected track
  const anyNext = lessons.find(isReady);
  if (anyNext) return anyNext.id;

  // 3. All done — rotate within same track for review, else full pool
  const pool = currentTrackId
    ? lessons.filter((l) => l.trackId === currentTrackId)
    : lessons;
  const reviewPool = pool.length > 0 ? pool : lessons;
  const n = dateStr
    .replace(/-/g, "")
    .split("")
    .reduce((a, c) => a * 10 + Number(c), 0);
  return reviewPool[n % reviewPool.length].id;
}

/** Returns the next available lesson ID per track (for secondary home cards). */
export function getNextLessonPerTrack(
  trackIds: string[],
  completedIds: string[],
): Record<string, string | null> {
  const result: Record<string, string | null> = {};
  for (const trackId of trackIds) {
    const lessons = _lessons()
      .filter(
        (l) =>
          l.trackId === trackId && l.status === "published" && l.tier === "free",
      )
      .sort((a, b) => a.order - b.order);
    const next =
      lessons.find(
        (l) =>
          !completedIds.includes(l.id) &&
          l.prerequisites.every((p) => completedIds.includes(p)),
      ) ??
      lessons[0] ??
      null;
    result[trackId] = next?.id ?? null;
  }
  return result;
}

/** Returns true when every published free lesson in the selected tracks is completed. */
export function isAllContentCompleted(
  trackIds: string[],
  completedIds: string[],
): boolean {
  if (!trackIds.length) return false;
  const lessons = _lessons().filter(
    (l) =>
      trackIds.includes(l.trackId) &&
      l.status === "published" &&
      l.tier === "free",
  );
  return (
    lessons.length > 0 && lessons.every((l) => completedIds.includes(l.id))
  );
}

/** All distinct trackIds that have at least one published lesson. */
export function getAllTrackIds(): string[] {
  return [
    ...new Set(
      _lessons()
        .filter((l) => l.status === "published")
        .map((l) => l.trackId),
    ),
  ];
}

/** Returns trackIds where every published free lesson has been completed. */
export function getCompletedTracks(completedIds: string[]): string[] {
  return getAllTrackIds().filter((trackId) => {
    const lessons = _lessons().filter(
      (l) =>
        l.trackId === trackId && l.status === "published" && l.tier === "free",
    );
    return (
      lessons.length > 0 && lessons.every((l) => completedIds.includes(l.id))
    );
  });
}

// ---------------------------------------------------------------------------
// Async function for track detail screen (returns fresh Firestore slice)
// ---------------------------------------------------------------------------

export async function getLessonsByTrack(
  trackId: string,
): Promise<LessonMeta[]> {
  // Use cache if already populated
  if (_cache) {
    return _cache
      .filter((l) => l.trackId === trackId && l.status === "published")
      .sort((a, b) => a.order - b.order);
  }
  // Fallback: direct Firestore query (e.g. if called before initLessons)
  const q = query(
    collection(db, "lessons"),
    where("trackId", "==", trackId),
    orderBy("order"),
  );
  const snap = await getDocs(q);
  return snap.docs.map((d) => ({ id: d.id, ...d.data() }) as LessonMeta);
}
