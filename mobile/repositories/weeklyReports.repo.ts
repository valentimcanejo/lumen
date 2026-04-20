import { collection, getDocs, orderBy, query, limit } from "firebase/firestore";
import { db } from "../firebase/firebaseConfig";
import type { WeeklyReport, MonthlyReport } from "../models/weeklyReport";

export async function getLatestWeeklyReport(uid: string): Promise<WeeklyReport | null> {
  const ref = collection(db, `users/${uid}/weekly_reports`);
  const q = query(ref, orderBy("generatedAt", "desc"), limit(1));
  const snap = await getDocs(q);
  if (snap.empty) return null;
  return snap.docs[0].data() as WeeklyReport;
}

export async function getLatestMonthlyReport(uid: string): Promise<MonthlyReport | null> {
  const ref = collection(db, `users/${uid}/monthly_reports`);
  const q = query(ref, orderBy("generatedAt", "desc"), limit(1));
  const snap = await getDocs(q);
  if (snap.empty) return null;
  return snap.docs[0].data() as MonthlyReport;
}
