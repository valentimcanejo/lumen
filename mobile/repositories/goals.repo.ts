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

const bundledGoals: (Goal & { isActive: boolean })[] = require("../assets/data/goals.json");

export function getBundledGoals(): Goal[] {
  return bundledGoals.filter((g) => g.isActive).sort((a, b) => a.order - b.order);
}

export async function getActiveGoals(): Promise<Goal[]> {
  try {
    const q = query(collection(db, "goals"), where("isActive", "==", true));
    const snap = await getDocs(q);
    if (!snap.empty) {
      return snap.docs
        .map((d) => d.data() as Goal)
        .sort((a, b) => a.order - b.order);
    }
  } catch {
    // offline or error — fall through to bundled
  }
  return getBundledGoals();
}
