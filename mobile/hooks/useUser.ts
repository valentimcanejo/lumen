import { useState } from "react";
import type { Lang } from "../models/lang";
import { collection, doc, setDoc } from "firebase/firestore";
import { db } from "../firebase/firebaseConfig";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { getDocData } from "../services/firestore.service";
import { UserProfile } from "../models/user";

export function useUser() {
  const [loading, setLoading] = useState(false);
  const userCollection = collection(db, "users");

  async function setUserPreferences(args: {
    userId: string;
    lang: Lang;
    topicHint?: string;
    minutes?: number;
    selectedGoalIds?: string[];
  }) {
    setLoading(true);
    try {
      await setDoc(
        doc(userCollection, args.userId),
        {
          lang: args.lang,
          ...(args.topicHint !== undefined && { topicHint: args.topicHint }),
          ...(args.minutes !== undefined && { dailyGoalMin: args.minutes }),
          selectedGoalIds: args.selectedGoalIds ?? [],
          updatedAt: Date.now(),
          hasOnboarded: true,
        },
        { merge: true }, // never overwrite xp/level/achievements/streak
      );

      await AsyncStorage.setItem("hasOnboarded", "true");
    } catch (error) {
      console.log(error);
    } finally {
      setLoading(false);
    }
  }

  const getUserData = async ({ userId }: { userId: string }) => {
    try {
      setLoading(true);
      const user = await getDocData<UserProfile>(`users/${userId}`);

      return user;
    } catch (error) {
      console.log(error);
    } finally {
      setLoading(false);
    }
  };

  return { setUserPreferences, loading, getUserData };
}
