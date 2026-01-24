import type { DailySessionMeta } from "../models/session";
import { getDocData } from "../services/firestore.service";

export function dailySessionPath(date: string) {
  return `daily_sessions/${date}`;
}

export async function getDailySessionMeta(date: string) {
  return getDocData<DailySessionMeta>(dailySessionPath(date));
}

export function todayYmd() {
  // timezone do device: simples e suficiente pro MVP
  const d = new Date();
  const yyyy = d.getFullYear();
  const mm = String(d.getMonth() + 1).padStart(2, "0");
  const dd = String(d.getDate()).padStart(2, "0");
  return `${yyyy}-${mm}-${dd}`;
}
