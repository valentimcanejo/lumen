import { collection, getDocs, query, orderBy } from "firebase/firestore";
import { db } from "../firebase/firebaseConfig";
import type { Track } from "../models/track";

const bundledTracks: Track[] = require("../assets/data/tracks.json");

export async function getTracks(): Promise<Track[]> {
  try {
    const q = query(collection(db, "tracks"), orderBy("order"));
    const snap = await getDocs(q);
    if (!snap.empty) {
      return snap.docs.map((d) => ({ id: d.id, ...d.data() } as Track));
    }
  } catch {
    // offline or error — fall through to bundled
  }
  return bundledTracks;
}
