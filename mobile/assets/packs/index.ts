import type { Pack } from "../../models/pack";
import type { Lang } from "../../models/lang";

const BUNDLED: Record<string, Pack> = {
  "critical_thinking:v1:pt": require("./critical_thinking_v1_pt.json"),
  "critical_thinking:v1:en": require("./critical_thinking_v1_en.json"),
  "critical_thinking:v1:es": require("./critical_thinking_v1_es.json"),
  "critical_thinking_fallacies:v1:pt": require("./critical_thinking_fallacies_v1_pt.json"),
  "critical_thinking_fallacies:v1:en": require("./critical_thinking_fallacies_v1_en.json"),
  "critical_thinking_fallacies:v1:es": require("./critical_thinking_fallacies_v1_es.json"),
  "critical_thinking_bias:v1:pt": require("./critical_thinking_bias_v1_pt.json"),
  "critical_thinking_bias:v1:en": require("./critical_thinking_bias_v1_en.json"),
  "critical_thinking_bias:v1:es": require("./critical_thinking_bias_v1_es.json"),
  "foundations:v1:pt": require("./foundations_v1_pt.json"),
  "foundations:v1:en": require("./foundations_v1_en.json"),
  "foundations:v1:es": require("./foundations_v1_es.json"),
  "foundations_mental_models:v1:pt": require("./foundations_mental_models_v1_pt.json"),
  "foundations_mental_models:v1:en": require("./foundations_mental_models_v1_en.json"),
  "foundations_mental_models:v1:es": require("./foundations_mental_models_v1_es.json"),
  "foundations_first_principles:v1:pt": require("./foundations_first_principles_v1_pt.json"),
  "foundations_first_principles:v1:en": require("./foundations_first_principles_v1_en.json"),
  "foundations_first_principles:v1:es": require("./foundations_first_principles_v1_es.json"),
  "geopolitics:v1:pt": require("./geopolitics_v1_pt.json"),
  "geopolitics:v1:en": require("./geopolitics_v1_en.json"),
  "geopolitics:v1:es": require("./geopolitics_v1_es.json"),
  "geopolitics_nato:v1:pt": require("./geopolitics_nato_v1_pt.json"),
  "geopolitics_nato:v1:en": require("./geopolitics_nato_v1_en.json"),
  "geopolitics_nato:v1:es": require("./geopolitics_nato_v1_es.json"),
  "geopolitics_brics:v1:pt": require("./geopolitics_brics_v1_pt.json"),
  "geopolitics_brics:v1:en": require("./geopolitics_brics_v1_en.json"),
  "geopolitics_brics:v1:es": require("./geopolitics_brics_v1_es.json"),
  "economics:v1:pt": require("./economics_v1_pt.json"),
  "economics:v1:en": require("./economics_v1_en.json"),
  "economics:v1:es": require("./economics_v1_es.json"),
  "economics_inflation:v1:pt": require("./economics_inflation_v1_pt.json"),
  "economics_inflation:v1:en": require("./economics_inflation_v1_en.json"),
  "economics_inflation:v1:es": require("./economics_inflation_v1_es.json"),
  "economics_interest_rates:v1:pt": require("./economics_interest_rates_v1_pt.json"),
  "economics_interest_rates:v1:en": require("./economics_interest_rates_v1_en.json"),
  "economics_interest_rates:v1:es": require("./economics_interest_rates_v1_es.json"),
};

export function getBundledPack(
  id: string,
  version: number,
  lang: Lang,
): Pack | null {
  return BUNDLED[`${id}:v${version}:${lang}`] ?? null;
}
