import type { Pack } from "../../models/pack";
import type { Lang } from "../../models/lang";

const BUNDLED: Record<string, Pack> = {
  "critical_thinking:v1:pt": require("./critical_thinking_v1_pt.json"),
  "critical_thinking:v1:en": require("./critical_thinking_v1_en.json"),
  "critical_thinking:v1:es": require("./critical_thinking_v1_es.json"),
};

export function getBundledPack(
  id: string,
  version: number,
  lang: Lang,
): Pack | null {
  return BUNDLED[`${id}:v${version}:${lang}`] ?? null;
}
