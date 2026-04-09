import { onCall, HttpsError } from "firebase-functions/v2/https";
import { setGlobalOptions } from "firebase-functions/v2";
import { defineSecret } from "firebase-functions/params";
import * as admin from "firebase-admin";
import Anthropic from "@anthropic-ai/sdk";
import OpenAI from "openai";

const openaiApiKey = defineSecret("OPENAI_API_KEY");

admin.initializeApp();

setGlobalOptions({ region: "us-central1" });

// ---------------------------------------------------------------------------
// Types (mirrors mobile/models/pack.ts)
// ---------------------------------------------------------------------------

type Lang = "pt" | "en" | "es";

interface GeneratePackInput {
  lang: Lang;
  topicHint?: string;
  minutes?: number;
}

interface PremiumInfo {
  isActive: boolean;
  until?: string;
}

interface UserData {
  premium?: PremiumInfo;
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

const LANG_NAMES: Record<Lang, string> = {
  pt: "Portuguese (Brazilian)",
  en: "English",
  es: "Spanish",
};

const DAILY_AI_LIMIT = 10;

async function checkPremium(uid: string): Promise<void> {
  const userSnap = await admin.firestore().doc(`users/${uid}`).get();
  const user = userSnap.data() as UserData | undefined;

  if (!user?.premium?.isActive) {
    throw new HttpsError("permission-denied", "Premium subscription required.");
  }

  if (user.premium.until) {
    const expiry = new Date(user.premium.until);
    if (expiry < new Date()) {
      throw new HttpsError("permission-denied", "Premium subscription expired.");
    }
  }
}

async function checkRateLimit(uid: string): Promise<void> {
  const today = new Date().toISOString().split("T")[0];
  const ref = admin.firestore().doc(`users/${uid}/ai_usage/${today}`);
  const snap = await ref.get();
  const count: number = snap.data()?.count ?? 0;

  if (count >= DAILY_AI_LIMIT) {
    throw new HttpsError(
      "resource-exhausted",
      `Daily AI pack limit reached (${DAILY_AI_LIMIT}/day). Try again tomorrow.`
    );
  }
}

async function incrementUsage(uid: string): Promise<void> {
  const today = new Date().toISOString().split("T")[0];
  const ref = admin.firestore().doc(`users/${uid}/ai_usage/${today}`);
  await ref.set(
    { count: admin.firestore.FieldValue.increment(1), date: today },
    { merge: true }
  );
}

function buildPrompt(lang: Lang, topicHint: string | undefined, minutes: number): string {
  const langName = LANG_NAMES[lang];
  const topicNote = topicHint
    ? `Topic: "${topicHint}"`
    : "Choose an interesting, educational topic from science, history, psychology, philosophy, or technology.";

  return `You are a content creator for Lumen, a mobile learning app. Generate a self-contained learning pack in ${langName}.

${topicNote}
Target study time: ${minutes} minutes.

Return ONLY valid JSON — no markdown, no explanation — matching this exact structure:
{
  "id": "<kebab-case-unique-id>",
  "version": 1,
  "lang": "${lang}",
  "estimatedMinutes": <number>,
  "tags": ["<tag>", ...],
  "difficulty": <1|2|3>,
  "lesson": {
    "title": "<string>",
    "summary": "<one sentence>",
    "blocks": [
      { "type": "h2", "text": "<string>" }
      | { "type": "p", "text": "<string>" }
      | { "type": "quote", "text": "<string>" }
      | { "type": "bullets", "items": ["<string>", ...] }
    ]
  },
  "cards": [
    { "id": "c1", "front": "<concept>", "back": "<explanation>" }
  ],
  "quiz": [
    {
      "id": "q1",
      "question": "<string>",
      "options": ["<opt0>", "<opt1>", "<opt2>", "<opt3>"],
      "answerIndex": <0|1|2|3>,
      "explanation": "<why this answer>"
    }
  ]
}

Rules:
- lesson.blocks: 5–8 blocks mixing h2, p, bullets (at least one of each), 1 optional quote
- cards: 6–10 cards with a clear concept on the front and a concise explanation on the back
- quiz: exactly 5 questions, 4 options each
  - 2 definition questions: test recall of a key concept ("What is X?", "What does X mean?")
  - 2 application questions: test understanding in context ("In which situation would X apply?", "What would happen if X?")
  - 1 example question: test recognition ("Which of these is an example of X?")
  - Vary the correct answer position — do NOT place the correct answer always at index 0
  - Each explanation should add insight beyond just restating the answer
- All text in ${langName}
- Return ONLY the JSON object, nothing else`;
}

// ---------------------------------------------------------------------------
// generateAudio — OpenAI TTS tts-1-hd
// ---------------------------------------------------------------------------

interface GenerateAudioInput {
  contentId: string;
  version: number;
  lang: Lang;
  text: string;
}

export const generateAudio = onCall(
  { enforceAppCheck: false, memory: "512MiB", invoker: "public", secrets: [openaiApiKey] },
  async (request) => {
    const { contentId, version, lang, text } = (request.data as GenerateAudioInput) ?? {};

    if (!contentId || !version || !["pt", "en", "es"].includes(lang) || !text?.trim()) {
      throw new HttpsError("invalid-argument", "contentId, version, lang and text are required.");
    }

    if (text.length > 10_000) {
      throw new HttpsError("invalid-argument", "text exceeds maximum length of 10,000 characters.");
    }

    const audioPath = `packs/${contentId}/v${version}/audio/${lang}_gpt.mp3`;
    const bucket = admin.storage().bucket();
    const audioFile = bucket.file(audioPath);

    // Idempotent: if audio already exists, return immediately
    const [exists] = await audioFile.exists();
    if (exists) return { storagePath: audioPath };

    // Call OpenAI TTS tts-1-hd
    const openai = new OpenAI({ apiKey: openaiApiKey.value() });
    const response = await openai.audio.speech.create({
      model: "tts-1-hd",
      voice: "onyx",
      input: text,
      response_format: "mp3",
    });

    const buffer = Buffer.from(await response.arrayBuffer());

    // Save MP3 to Firebase Storage
    await audioFile.save(buffer, {
      contentType: "audio/mpeg",
      metadata: { cacheControl: "public, max-age=31536000" },
    });

    return { storagePath: audioPath };
  }
);

// ---------------------------------------------------------------------------
// Cloud Function
// ---------------------------------------------------------------------------

export const generatePack = onCall(
  { enforceAppCheck: false },
  async (request) => {
    // 1. Auth
    if (!request.auth) {
      throw new HttpsError("unauthenticated", "Authentication required.");
    }

    const uid = request.auth.uid;

    // 2. Premium + rate limit (parallel)
    await Promise.all([checkPremium(uid), checkRateLimit(uid)]);

    // 3. Parse input
    const { lang = "pt", topicHint, minutes = 10 } =
      (request.data as GeneratePackInput) ?? {};

    if (!["pt", "en", "es"].includes(lang)) {
      throw new HttpsError("invalid-argument", "lang must be pt, en, or es.");
    }

    // 4. Generate with Anthropic
    const client = new Anthropic();
    const message = await client.messages.create({
      model: "claude-haiku-4-5-20251001",
      max_tokens: 4096,
      messages: [
        {
          role: "user",
          content: buildPrompt(lang, topicHint, minutes),
        },
      ],
    });

    const block = message.content[0];
    if (block.type !== "text") {
      throw new HttpsError("internal", "Unexpected response format from AI.");
    }

    // 5. Parse and validate JSON
    let pack: Record<string, unknown>;
    try {
      pack = JSON.parse(block.text);
    } catch {
      throw new HttpsError("internal", "AI returned invalid JSON.");
    }

    if (!pack.id || !pack.lesson || !pack.cards || !pack.quiz) {
      throw new HttpsError("internal", "AI returned incomplete pack structure.");
    }

    // 6. Stamp source and increment counter
    pack.source = "ai";
    pack.lang = lang;

    await incrementUsage(uid);

    return pack;
  }
);
