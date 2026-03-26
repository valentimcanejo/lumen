import { useCallback, useEffect, useState } from "react";
import {
  getCurrentWeekId,
  getTopEntries,
  getCurrentUserEntry,
} from "../repositories/leaderboard.repo";
import { getLevelTier } from "../models/user";
import type { LeaderboardState } from "../models/leaderboard";

export function useLeaderboard(uid: string | null, level: number) {
  const [state, setState] = useState<LeaderboardState | null>(null);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    if (!uid) return;
    setLoading(true);
    try {
      const weekId = getCurrentWeekId();
      const tier = getLevelTier(level);
      const [entries, userEntry] = await Promise.all([
        getTopEntries(weekId, tier.id),
        getCurrentUserEntry(uid, weekId, tier.id),
      ]);

      const rankInTop = entries.findIndex((e) => e.uid === uid);
      const currentUserRank = rankInTop >= 0 ? rankInTop + 1 : null;

      setState({ entries, currentUserEntry: userEntry, currentUserRank, weekId, tier });
    } finally {
      setLoading(false);
    }
  }, [uid, level]);

  useEffect(() => { load(); }, [load]);

  return { state, loading, refresh: load };
}
