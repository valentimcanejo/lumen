import { useState } from "react";
import type { Lang } from "../models/lang";
import type { Pack } from "../models/pack";
import { generateAiPack } from "../services/functions.service";
import { saveAiPackToCache } from "../repositories/packs.repo";
import { getUser } from "../repositories/user.repo";

export type AiPackError =
  | "not-premium"
  | "premium-expired"
  | "rate-limited"
  | "unknown";

export function useAiPack(uid: string | null) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<AiPackError | null>(null);

  async function generate(args: {
    lang: Lang;
    topicHint?: string;
    minutes?: number;
  }): Promise<Pack | null> {
    if (!uid) {
      setError("not-premium");
      return null;
    }

    // Client-side premium check for fast feedback before the network call
    const user = await getUser(uid);
    if (!user?.premium?.isActive) {
      setError("not-premium");
      return null;
    }
    if (user.premium.until && new Date(user.premium.until) < new Date()) {
      setError("premium-expired");
      return null;
    }

    setLoading(true);
    setError(null);

    try {
      const pack: Pack = await generateAiPack(args);
      await saveAiPackToCache(pack);
      return pack;
    } catch (err: unknown) {
      const firebaseError = err as { code?: string };
      if (firebaseError.code === "functions/permission-denied") {
        setError("not-premium");
      } else if (firebaseError.code === "functions/resource-exhausted") {
        setError("rate-limited");
      } else {
        setError("unknown");
      }
      return null;
    } finally {
      setLoading(false);
    }
  }

  return { generate, loading, error };
}
