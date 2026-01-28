import { collection, getDocs, query, where } from "firebase/firestore";
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

export async function getActiveGoals(): Promise<Goal[]> {
  const q = query(collection(db, "goals"), where("isActive", "==", true));

  const snap = await getDocs(q);
  return snap.docs
    .map((d) => d.data() as Goal)
    .sort((a, b) => a.order - b.order);
}
