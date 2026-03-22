import type { Pack } from "../models/pack";
import type { Lang } from "../models/lang";
import { cacheGetJson, cacheSetJson } from "../storage/cache.fs";
import { downloadJson } from "../services/storage.service";
import { getBundledPack } from "../assets/packs";

function packCacheKey(contentId: string, version: number, lang: Lang) {
  return `pack:${contentId}:v${version}:${lang}`;
}

function storagePathForPack(contentId: string, version: number, lang: Lang) {
  // Storage: packs/<contentId>/v<version>/<lang>.json
  return `packs/${contentId}/v${version}/${lang}.json`;
}

export async function getPack(
  contentId: string,
  version: number,
  lang: Lang,
): Promise<Pack> {
  const key = packCacheKey(contentId, version, lang);

  const cached = await cacheGetJson<Pack>(key);
  if (cached) return cached;

  const bundled = getBundledPack(contentId, version, lang);
  if (bundled) return bundled;

  const remote = await downloadJson<Pack>(
    storagePathForPack(contentId, version, lang),
  );
  const normalized: Pack = {
    ...remote,
    source: remote.source ?? "remote",
    lang,
  };

  await cacheSetJson(key, normalized);
  return normalized;
}

export async function saveAiPackToCache(pack: Pack) {
  const key = packCacheKey(pack.id, pack.version, pack.lang);
  await cacheSetJson(key, { ...pack, source: "ai" });
}
