import type { Pack } from "../../models/pack";
import type { Lang } from "../../models/lang";

const BUNDLED: Record<string, Pack> = {
  "critical_thinking:v1:pt": require("./critical_thinking_v1_pt.json"),
  "critical_thinking:v1:en": require("./critical_thinking_v1_en.json"),
  "critical_thinking:v1:es": require("./critical_thinking_v1_es.json"),
  "foundations:v1:pt": require("./foundations_v1_pt.json"),
  "foundations:v1:en": require("./foundations_v1_en.json"),
  "foundations:v1:es": require("./foundations_v1_es.json"),
  "geopolitics:v1:pt": require("./geopolitics_v1_pt.json"),
  "geopolitics:v1:en": require("./geopolitics_v1_en.json"),
  "geopolitics:v1:es": require("./geopolitics_v1_es.json"),
  "economics:v1:pt": require("./economics_v1_pt.json"),
  "economics:v1:en": require("./economics_v1_en.json"),
  "economics:v1:es": require("./economics_v1_es.json"),
};

export function getBundledPack(
  id: string,
  version: number,
  lang: Lang,
): Pack | null {
  return BUNDLED[`${id}:v${version}:${lang}`] ?? null;
}
