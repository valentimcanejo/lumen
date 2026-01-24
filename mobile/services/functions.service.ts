import { functions } from "../firebase/firebaseConfig";
import { httpsCallable } from "firebase/functions";
import type { Pack } from "../models/pack";
import type { Lang } from "../models/lang";

type GeneratePackInput = {
  lang: Lang;
  topicHint?: string;
  minutes?: number;
};

export async function generateAiPack(input: GeneratePackInput): Promise<Pack> {
  const fn = httpsCallable<GeneratePackInput, Pack>(functions, "generatePack");
  const result = await fn(input);
  return result.data;
}
