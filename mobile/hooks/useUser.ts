import { useState } from "react";
import type { Lang } from "../models/lang";
import { collection, doc, setDoc } from "firebase/firestore";
import { db } from "../firebase/firebaseConfig";
import { getDocData } from "../services/firestore.service";
import { UserProfile } from "../models/user";

// ---------------------------------------------------------------------------
// Module-level cache — survives re-renders, cleared on sign-out or after TTL
// ---------------------------------------------------------------------------
const CACHE_TTL_MS = 60_000; // 60 s
const cache = new Map<string, { data: UserProfile; expiresAt: number }>();

export function invalidateUserCache(uid: string) {
  cache.delete(uid);
}

export function useUser() {
  const [loading, setLoading] = useState(false);
  const userCollection = collection(db, "users");

  async function setUserPreferences(args: {
    userId: string;
    lang: Lang;
    topicHint?: string;
    minutes?: number;
    selectedTrackIds?: string[];
  }) {
    setLoading(true);
    try {
      await setDoc(
        doc(userCollection, args.userId),
        {
          lang: args.lang,
          ...(args.topicHint !== undefined && { topicHint: args.topicHint }),
          ...(args.minutes !== undefined && { dailyGoalMin: args.minutes }),
          selectedTrackIds: args.selectedTrackIds ?? [],
          updatedAt: Date.now(),
          hasOnboarded: true,
        },
        { merge: true }, // never overwrite xp/level/achievements/streak
      );

    } catch (error) {
      console.log(error);
    } finally {
      setLoading(false);
    }
  }

  const getUserData = async ({ userId }: { userId: string }) => {
    try {
      setLoading(true);

      const cached = cache.get(userId);
      if (cached && Date.now() < cached.expiresAt) return cached.data;

      const user = await getDocData<UserProfile>(`users/${userId}`);
      if (user) cache.set(userId, { data: user, expiresAt: Date.now() + CACHE_TTL_MS });
      return user;
    } catch (error) {
      console.log(error);
    } finally {
      setLoading(false);
    }
  };

  return { setUserPreferences, loading, getUserData };
}
