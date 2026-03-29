import { collection, getDocs, query, orderBy } from "firebase/firestore";
import { db } from "../firebase/firebaseConfig";
import type { Track } from "../models/track";

export async function getTracks(): Promise<Track[]> {
  const q = query(collection(db, "tracks"), orderBy("order"));
  const snap = await getDocs(q);
  return snap.docs.map((d) => ({ id: d.id, ...d.data() } as Track));
}
