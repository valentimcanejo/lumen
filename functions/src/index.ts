import { onCall, onRequest, HttpsError } from "firebase-functions/v2/https";
import { onSchedule } from "firebase-functions/v2/scheduler";
import { setGlobalOptions } from "firebase-functions/v2";
import { defineSecret } from "firebase-functions/params";
import * as admin from "firebase-admin";
import Anthropic from "@anthropic-ai/sdk";
import OpenAI from "openai";

const openaiApiKey = defineSecret("OPENAI_API_KEY");
const rcWebhookSecret = defineSecret("REVENUECAT_WEBHOOK_SECRET");

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
- lesson.blocks: 10–14 blocks. Required structure:
  - At least 3 h2 section headers
  - At least 4 p paragraphs (each 2–4 sentences, dense and informative)
  - At least 2 bullets lists (3–4 items each)
  - Exactly 1 quote from a relevant author, thinker, or historical figure
  - Suggested flow: intro concept → historical/origin context → why it matters → real-world example → how to apply / critical perspective → key takeaways
  - Each paragraph must add new information — no filler or repetition
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

// ---------------------------------------------------------------------------
// revenuecatWebhook — activates / deactivates premium.isActive in Firestore
// Configure in RevenueCat dashboard: Project → Integrations → Webhooks
// Authorization header value must match REVENUECAT_WEBHOOK_SECRET
// ---------------------------------------------------------------------------

const ACTIVATE_EVENTS = new Set([
  "INITIAL_PURCHASE",
  "RENEWAL",
  "PRODUCT_CHANGE",
  "UNCANCELLATION",
]);

const DEACTIVATE_EVENTS = new Set([
  "EXPIRATION",
]);

export const revenuecatWebhook = onRequest(
  { secrets: [rcWebhookSecret] },
  async (req, res) => {
    if (req.method !== "POST") {
      res.status(405).send("Method Not Allowed");
      return;
    }

    const authHeader = req.headers.authorization ?? "";
    if (authHeader !== `Bearer ${rcWebhookSecret.value()}`) {
      res.status(401).send("Unauthorized");
      return;
    }

    const event = req.body?.event;
    if (!event?.app_user_id) {
      res.status(400).send("Missing event or app_user_id");
      return;
    }

    const { type, app_user_id, expiration_at_ms } = event as {
      type: string;
      app_user_id: string;
      expiration_at_ms: number | null;
    };

    const userRef = admin.firestore().doc(`users/${app_user_id}`);

    if (ACTIVATE_EVENTS.has(type)) {
      await userRef.set(
        {
          premium: {
            isActive: true,
            until: expiration_at_ms ? new Date(expiration_at_ms).toISOString() : null,
          },
          updatedAt: Date.now(),
        },
        { merge: true }
      );
    } else if (DEACTIVATE_EVENTS.has(type)) {
      await userRef.set(
        {
          premium: { isActive: false, until: null },
          updatedAt: Date.now(),
        },
        { merge: true }
      );
    }

    res.status(200).send("OK");
  }
);

// ---------------------------------------------------------------------------
// generateWeeklyReports — runs every Monday at 10:00 UTC (07:00 Brasília)
// Generates a personalised AI learning summary for each active premium user
// Saves to: users/{uid}/weekly_reports/{YYYY-WNN}
// ---------------------------------------------------------------------------

function getWeekId(date: Date): string {
  // ISO week: YYYY-WNN
  const d = new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()));
  const dayNum = d.getUTCDay() || 7;
  d.setUTCDate(d.getUTCDate() + 4 - dayNum);
  const yearStart = new Date(Date.UTC(d.getUTCFullYear(), 0, 1));
  const weekNo = Math.ceil((((d.getTime() - yearStart.getTime()) / 86400000) + 1) / 7);
  return `${d.getUTCFullYear()}-W${String(weekNo).padStart(2, "0")}`;
}

function buildReportPrompt(
  lang: "pt" | "en" | "es",
  weekId: string,
  stats: { sessionsCompleted: number; minutesStudied: number; xpEarned: number; topTracks: string[] },
): string {
  const langName = LANG_NAMES[lang];
  const tracksLine = stats.topTracks.length > 0
    ? `Top tracks studied: ${stats.topTracks.join(", ")}.`
    : "No specific tracks identified.";

  return `You are a learning coach for Lumen, a knowledge app. Write a personalised weekly learning report for a user in ${langName}.

Week: ${weekId}
Sessions completed: ${stats.sessionsCompleted}
Minutes studied: ${stats.minutesStudied}
XP earned: ${stats.xpEarned}
${tracksLine}

Return ONLY valid JSON — no markdown — matching this exact structure:
{
  "headline": "<motivational headline, max 60 chars>",
  "summary": "<2-3 sentences summarising the week's learning effort and achievements>",
  "highlight": "<one interesting insight or fact the user likely encountered this week based on their tracks>",
  "suggestion": "<one concrete suggestion for what to study next week, based on tracks covered>"
}

Rules:
- All text in ${langName}
- Be warm, specific, and encouraging — like a smart friend reviewing their week
- Return ONLY the JSON object`;
}

export const generateWeeklyReports = onSchedule(
  {
    schedule: "every monday 10:00",
    timeZone: "UTC",
    secrets: [openaiApiKey],
    memory: "512MiB",
    timeoutSeconds: 540,
  },
  async () => {
    const db = admin.firestore();
    const now = new Date();
    const weekId = getWeekId(now);

    // Monday = start of THIS week; look back 7 days for session data
    const weekStart = new Date(now);
    weekStart.setUTCDate(weekStart.getUTCDate() - 7);
    const weekStartStr = weekStart.toISOString().split("T")[0];
    const weekEndStr = new Date(now.getTime() - 86400000).toISOString().split("T")[0];

    // Fetch all premium users
    const usersSnap = await db.collection("users")
      .where("premium.isActive", "==", true)
      .get();

    if (usersSnap.empty) {
      console.log("No premium users found — skipping report generation.");
      return;
    }

    const openai = new OpenAI({ apiKey: openaiApiKey.value() });
    let generated = 0;
    let skipped = 0;

    for (const userDoc of usersSnap.docs) {
      const uid = userDoc.id;
      const userData = userDoc.data();
      const lang: "pt" | "en" | "es" = ["pt", "en", "es"].includes(userData.lang)
        ? userData.lang
        : "pt";

      // Skip if report already exists for this week
      const reportRef = db.doc(`users/${uid}/weekly_reports/${weekId}`);
      const existing = await reportRef.get();
      if (existing.exists) {
        skipped++;
        continue;
      }

      // Fetch daily session docs for the past week
      const sessionsSnap = await db.collection(`users/${uid}/daily_sessions`)
        .where("date", ">=", weekStartStr)
        .where("date", "<=", weekEndStr)
        .get();

      let sessionsCompleted = 0;
      let minutesStudied = 0;
      let xpEarned = 0;
      const trackCounts: Record<string, number> = {};

      sessionsSnap.docs.forEach((d) => {
        const s = d.data();
        sessionsCompleted += s.sessionsCompleted ?? 1;
        minutesStudied += s.totalMinutes ?? s.minutes ?? 0;
        xpEarned += s.xpEarned ?? 0;
        if (s.trackId) trackCounts[s.trackId] = (trackCounts[s.trackId] ?? 0) + 1;
      });

      // No activity this week — skip (don't write a "you did nothing" report)
      if (sessionsCompleted === 0 && minutesStudied === 0) {
        skipped++;
        continue;
      }

      const topTracks = Object.entries(trackCounts)
        .sort(([, a], [, b]) => b - a)
        .slice(0, 3)
        .map(([id]) => id);

      const stats = { sessionsCompleted, minutesStudied, xpEarned, topTracks };

      try {
        const completion = await openai.chat.completions.create({
          model: "gpt-4o-mini",
          max_tokens: 512,
          messages: [{ role: "user", content: buildReportPrompt(lang, weekId, stats) }],
        });

        const raw = completion.choices[0]?.message?.content ?? "{}";
        let parsed: { headline?: string; summary?: string; highlight?: string; suggestion?: string };
        try {
          parsed = JSON.parse(raw);
        } catch {
          console.error(`[${uid}] Failed to parse AI response:`, raw);
          continue;
        }

        await reportRef.set({
          weekId,
          generatedAt: Date.now(),
          lang,
          headline: parsed.headline ?? "",
          summary: parsed.summary ?? "",
          highlight: parsed.highlight ?? "",
          suggestion: parsed.suggestion ?? "",
          stats,
        });

        generated++;
      } catch (err) {
        console.error(`[${uid}] Error generating report:`, err);
      }
    }

    console.log(`Weekly reports done — generated: ${generated}, skipped: ${skipped}`);
  }
);
