import { db } from "../firebase/firebaseConfig";
import {
  doc,
  getDoc,
  setDoc,
  updateDoc,
  onSnapshot,
  DocumentData,
} from "firebase/firestore";

export async function getDocData<T>(path: string): Promise<T | null> {
  const ref = doc(db, path);
  const snap = await getDoc(ref);
  return snap.exists() ? (snap.data() as T) : null;
}

export async function setDocData<T extends DocumentData>(
  path: string,
  data: T,
) {
  const ref = doc(db, path);
  await setDoc(ref, data, { merge: true });
}

export async function updateDocData<T extends DocumentData>(
  path: string,
  data: Partial<T>,
) {
  const ref = doc(db, path);
  await updateDoc(ref, data);
}

export function listenDoc<T>(path: string, cb: (value: T | null) => void) {
  const ref = doc(db, path);
  return onSnapshot(ref, (snap) =>
    cb(snap.exists() ? (snap.data() as T) : null),
  );
}
