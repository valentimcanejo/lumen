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
      await setDoc(doc(userCollection, args.userId), {
        ...args,
        createdAt: Date.now(),
        updatedAt: Date.now(),
        hasOnboarded: true,
        streak: { current: 0, best: 0, shields: 0, lastStudyDate: null },
        selectedGoalIds: args.selectedGoalIds || [],
      });

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
