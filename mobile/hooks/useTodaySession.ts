import { useEffect, useState } from "react";
import type { DailySessionMeta } from "../models/session";
import { getDailySessionMeta, todayYmd } from "../repositories/session.repo";

export function useTodaySession() {
  const [meta, setMeta] = useState<DailySessionMeta | null>(null);
  const [loading, setLoading] = useState(true);
  const date = todayYmd();

  useEffect(() => {
    let alive = true;
    setLoading(true);

    getDailySessionMeta(date)
      .then((v) => {
        if (alive) setMeta(v);
      })
      .finally(() => {
        if (alive) setLoading(false);
      });

    return () => {
      alive = false;
    };
  }, [date]);

  return { date, meta, loading };
}
