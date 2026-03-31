import { collection, getDocs, query, orderBy } from "firebase/firestore";
import { db } from "../firebase/firebaseConfig";
import type { Track } from "../models/track";

let _tracksCache: Track[] | null = null;

export async function getTracks(): Promise<Track[]> {
  if (_tracksCache) return _tracksCache;
  const q = query(collection(db, "tracks"), orderBy("order"));
  const snap = await getDocs(q);
  _tracksCache = snap.docs.map((d) => ({ id: d.id, ...d.data() } as Track));
  return _tracksCache;
}
