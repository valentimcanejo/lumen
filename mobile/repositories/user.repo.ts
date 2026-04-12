import {
  doc, collection, getDocs, setDoc, deleteDoc, orderBy, query,
} from "firebase/firestore";
import { getCurrentWeekId } from "./leaderboard.repo";
import type { TierId } from "../models/user";
import { db } from "../firebase/firebaseConfig";
import type { UserProfile } from "../models/user";
import type { Lang } from "../models/lang";
import {
  getDocData,
  setDocData,
  updateDocData,
} from "../services/firestore.service";

export function userPath(uid: string) {
  return `users/${uid}`;
}

export async function getUser(uid: string) {
  return getDocData<UserProfile>(userPath(uid));
}

export async function ensureUser(
  uid: string,
  defaults: Omit<UserProfile, "uid">,
) {
  const existing = await getUser(uid);
  if (existing) return existing;

  const created: UserProfile = { uid, ...defaults };
  await setDocData(userPath(uid), created);
  return created;
}

export async function setUserLanguage(uid: string, lang: Lang) {
  await updateDocData<UserProfile>(userPath(uid), {
    lang,
    updatedAt: Date.now(),
  });
}

export async function setSelectedTracks(uid: string, trackIds: string[]) {
  await updateDocData<UserProfile>(userPath(uid), {
    selectedTrackIds: trackIds,
    updatedAt: Date.now(),
  });
}

export async function setDailyGoal(uid: string, minutes: 5 | 10 | 15) {
  await updateDocData<UserProfile>(userPath(uid), {
    dailyGoalMin: minutes,
    updatedAt: Date.now(),
  });
}

// ---------------------------------------------------------------------------
// Completed content — subcollection (replaces completedContentIds array on user doc)
// Path: users/{uid}/completed_content/{contentId}
// ---------------------------------------------------------------------------

export async function markContentCompleted(uid: string, contentId: string) {
  await setDoc(
    doc(db, "users", uid, "completed_content", contentId),
    { contentId, completedAt: Date.now() },
  );
}

export async function getCompletedContentIds(uid: string): Promise<string[]> {
  const snap = await getDocs(collection(db, "users", uid, "completed_content"));
  return snap.docs.map((d) => d.id);
}

// ---------------------------------------------------------------------------
// Saved content — subcollection (replaces savedContentIds array on user doc)
// Path: users/{uid}/saved_content/{contentId}
// ---------------------------------------------------------------------------

export async function toggleSaveContent(
  uid: string,
  contentId: string,
  save: boolean,
) {
  const ref = doc(db, "users", uid, "saved_content", contentId);
  if (save) {
    await setDoc(ref, { contentId, savedAt: Date.now() });
  } else {
    await deleteDoc(ref);
  }
}

export async function getSavedContentIds(uid: string): Promise<string[]> {
  const q = query(
    collection(db, "users", uid, "saved_content"),
    orderBy("savedAt", "desc"),
  );
  const snap = await getDocs(q);
  return snap.docs.map((d) => d.id);
}

// ---------------------------------------------------------------------------
// Full reset — wipes all Firestore data for the user
// Call this before clearing AsyncStorage/FileSystem and reloading the app.
// ---------------------------------------------------------------------------

const TIER_IDS: TierId[] = [
  "bronze", "prata", "ouro", "platina", "safira",
  "esmeralda", "ametista", "rubi", "diamante", "lumen",
];

const USER_SUBCOLS = [
  "daily_sessions",
  "card_progress",
  "completed_content",
  "saved_content",
  "stats",
];

export async function resetAllUserData(uid: string): Promise<void> {
  // Delete all docs in each subcollection
  await Promise.all(
    USER_SUBCOLS.map(async (col) => {
      const snap = await getDocs(collection(db, "users", uid, col));
      await Promise.all(snap.docs.map((d) => deleteDoc(d.ref)));
    }),
  );

  // Delete leaderboard entries for the current week (all tiers)
  const weekId = getCurrentWeekId();
  await Promise.all(
    TIER_IDS.map((tierId) =>
      deleteDoc(doc(db, `leaderboard/${weekId}/${tierId}/${uid}`)),
    ),
  );

  // Delete the user doc itself
  await deleteDoc(doc(db, "users", uid));
}
