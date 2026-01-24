import { useState } from "react";
import type { Lang } from "../models/lang";
import type { Pack } from "../models/pack";
import { generateAiPack } from "../services/functions.service";
import { saveAiPackToCache } from "../repositories/packs.repo";

export function useAiPack() {
  const [loading, setLoading] = useState(false);

  async function generate(args: {
    lang: Lang;
    topicHint?: string;
    minutes?: number;
  }) {
    setLoading(true);
    try {
      const pack: Pack = await generateAiPack(args);
      await saveAiPackToCache(pack);
      return pack;
    } finally {
      setLoading(false);
    }
  }

  return { generate, loading };
}
