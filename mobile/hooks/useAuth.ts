import { useEffect, useState } from "react";
import type { User } from "firebase/auth";
import { ensureAnonymousAuth, listenAuth } from "../services/auth.service";

export function useAuth() {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let unsub = listenAuth((u) => {
      setUser(u);
      setLoading(false);
    });

    // garante anônimo no primeiro boot
    ensureAnonymousAuth().catch(() => {
      // se falhar, ainda deixa UI seguir (você pode tratar com toast)
    });

    return () => unsub();
  }, []);

  return { user, loading, uid: user?.uid ?? null };
}
