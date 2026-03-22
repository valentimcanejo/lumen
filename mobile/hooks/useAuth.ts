import { useCallback, useEffect, useState } from "react";
import type { User } from "firebase/auth";
import {
  ensureAnonymousAuth,
  listenAuth,
  signInWithGoogle,
  signInWithApple,
  signOut,
} from "../services/auth.service";

export function useAuth() {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const unsub = listenAuth((u) => {
      setUser(u);
      setLoading(false);
    });

    ensureAnonymousAuth().catch(() => {
      // silently ignore — UI can proceed without auth
    });

    return unsub;
  }, []);

  const handleSignInWithGoogle = useCallback(async () => {
    const u = await signInWithGoogle();
    setUser(u);
    return u;
  }, []);

  const handleSignInWithApple = useCallback(async () => {
    const u = await signInWithApple();
    setUser(u);
    return u;
  }, []);

  const handleSignOut = useCallback(async () => {
    await signOut();
    // listenAuth will fire and reset user state
  }, []);

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
