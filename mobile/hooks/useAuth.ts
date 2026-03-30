import { useCallback, useEffect, useState } from "react";
import type { User } from "firebase/auth";
import {
  ensureAnonymousAuth,
  listenAuth,
  signInWithGoogle,
  signInWithApple,
  signOut,
} from "../services/auth.service";
import { invalidateUserCache } from "./useUser";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { router } from "expo-router";

export function useAuth() {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const unsub = listenAuth((u) => {
      if (u === null) {
        // Firebase loaded auth state and found no user — create anonymous session.
        // We do this here (not outside the callback) to avoid a race condition where
        // auth.currentUser is still null while Firebase is restoring a persisted session
        // from AsyncStorage, which would create a new anonymous user and overwrite it.
        ensureAnonymousAuth().catch(() => {});
        return;
      }
      setUser(u);
      setLoading(false);
    });

    return unsub;
  }, []);

  const handleSignInWithGoogle = useCallback(async () => {
    const u = await signInWithGoogle();
    invalidateUserCache(u.uid);
    setUser(u);
    return u;
  }, []);

  const handleSignInWithApple = useCallback(async () => {
    const u = await signInWithApple();
    setUser(u);
    return u;
  }, []);

  const handleSignOut = useCallback(async () => {
    if (user?.uid) invalidateUserCache(user.uid);
    await signOut();
    await AsyncStorage.removeItem("hasOnboarded");
    router.replace("/(onboarding)/welcome");
  }, [user?.uid]);

  return {
    user,
    loading,
    uid: user?.uid ?? null,
    isAnonymous: user?.isAnonymous ?? true,
    signInWithGoogle: handleSignInWithGoogle,
    signInWithApple: handleSignInWithApple,
    signOut: handleSignOut,
  };
}
