import {
  collection,
  doc,
  getDocs,
  setDoc,
} from "firebase/firestore";
import { db } from "../firebase/firebaseConfig";

export type GlossaryEntry = {
  term: string;
  definition: string;
  contentId: string;
  trackId: string;
  lessonTitle: string;
};

export type GlossaryLesson = {
  contentId: string;
  trackId: string;
  lessonTitle: string;
  lang: string;
  entries: { term: string; definition: string }[];
};

export async function saveGlossaryForLesson(
  uid: string,
  lesson: GlossaryLesson,
): Promise<void> {
  if (!lesson.entries.length) return;
  const ref = doc(db, `users/${uid}/glossary/${lesson.contentId}`);
  await setDoc(ref, lesson, { merge: false });
}

export async function getGlossary(uid: string): Promise<GlossaryEntry[]> {
  const ref = collection(db, `users/${uid}/glossary`);
  const snap = await getDocs(ref);
  const result: GlossaryEntry[] = [];
  for (const d of snap.docs) {
    const data = d.data() as GlossaryLesson;
    for (const e of data.entries ?? []) {
      result.push({
        term: e.term,
        definition: e.definition,
        contentId: data.contentId,
        trackId: data.trackId,
        lessonTitle: data.lessonTitle,
      });
    }
  }
  return result;
}
