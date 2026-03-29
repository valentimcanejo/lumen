import { collection, getDocs, query, orderBy } from "firebase/firestore";
import { db } from "../firebase/firebaseConfig";
import type { Lang } from "../models/lang";

export type Goal = {
  id: string;
  order: number;
  icon: string;
  color: string;
  title: Record<Lang, string>;
  description?: Record<Lang, string>;
};

export async function getGoals(): Promise<Goal[]> {
  const q = query(collection(db, "goals"), orderBy("order"));
  const snap = await getDocs(q);
  return snap.docs
    .map((d) => ({ id: d.id, ...d.data() }) as Goal & { isActive?: boolean })
    .filter((g) => g.isActive !== false);
}
