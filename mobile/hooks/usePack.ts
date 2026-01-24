import { useEffect, useState } from "react";
import type { Pack } from "../models/pack";
import type { Lang } from "../models/lang";
import { getPack } from "../repositories/packs.repo";

export function usePack(args: {
  contentId?: string;
  version?: number;
  lang: Lang;
}) {
  const { contentId, version, lang } = args;
  const [pack, setPack] = useState<Pack | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!contentId || !version) return;

    let alive = true;
    setLoading(true);
    setError(null);

    getPack(contentId, version, lang)
      .then((p) => {
        if (alive) setPack(p);
      })
      .catch((e) => {
        if (alive) setError(e?.message ?? "Failed to load pack");
      })
      .finally(() => {
        if (alive) setLoading(false);
      });

    return () => {
      alive = false;
    };
  }, [contentId, version, lang]);

  return { pack, loading, error };
}
