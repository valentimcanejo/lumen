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

type GenerateAudioInput = {
  contentId: string;
  version: number;
  lang: Lang;
  text: string;
};

export async function generateAudio(input: GenerateAudioInput): Promise<void> {
  const fn = httpsCallable<GenerateAudioInput, { storagePath: string }>(functions, "generateAudio");
  await fn(input);
}
