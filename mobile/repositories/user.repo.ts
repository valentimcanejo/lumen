import { doc, updateDoc, arrayUnion, arrayRemove } from "firebase/firestore";
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

export async function setDailyGoal(uid: string, minutes: 5 | 10 | 15) {
  await updateDocData<UserProfile>(userPath(uid), {
    dailyGoalMin: minutes,
    updatedAt: Date.now(),
  });
}

export async function markContentCompleted(uid: string, contentId: string) {
  await updateDoc(doc(db, userPath(uid)), {
    completedContentIds: arrayUnion(contentId),
    updatedAt: Date.now(),
  });
}

export async function toggleSaveContent(
  uid: string,
  contentId: string,
  save: boolean,
) {
  await updateDoc(doc(db, userPath(uid)), {
    savedContentIds: save ? arrayUnion(contentId) : arrayRemove(contentId),
    updatedAt: Date.now(),
  });
}
