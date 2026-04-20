import {
  collection,
  getDocs,
  doc,
  updateDoc,
  orderBy,
  query,
  limit,
} from "firebase/firestore";
import { db } from "../firebase/firebaseConfig";
import type { KnowledgeInsight } from "../models/insight";

export async function getLatestInsights(uid: string, count = 5): Promise<KnowledgeInsight[]> {
  const ref = collection(db, `users/${uid}/insights`);
  const q = query(ref, orderBy("generatedAt", "desc"), limit(count));
  const snap = await getDocs(q);
  return snap.docs.map((d) => ({ id: d.id, ...d.data() } as KnowledgeInsight));
}

export async function markInsightRead(uid: string, insightId: string): Promise<void> {
  await updateDoc(doc(db, `users/${uid}/insights/${insightId}`), { read: true });
}
