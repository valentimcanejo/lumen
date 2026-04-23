"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.generateKnowledgeInsights = exports.generateMonthlyReports = exports.generateWeeklyReports = exports.revenuecatWebhook = exports.generatePack = exports.generateAudio = void 0;
const https_1 = require("firebase-functions/v2/https");
const scheduler_1 = require("firebase-functions/v2/scheduler");
const v2_1 = require("firebase-functions/v2");
const params_1 = require("firebase-functions/params");
const admin = __importStar(require("firebase-admin"));
const sdk_1 = __importDefault(require("@anthropic-ai/sdk"));
const openai_1 = __importDefault(require("openai"));
const openaiApiKey = (0, params_1.defineSecret)("OPENAI_API_KEY");
const rcWebhookSecret = (0, params_1.defineSecret)("REVENUECAT_WEBHOOK_SECRET");
admin.initializeApp();
(0, v2_1.setGlobalOptions)({ region: "us-central1" });
// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------
const LANG_NAMES = {
    pt: "Portuguese (Brazilian)",
    en: "English",
    es: "Spanish",
};
const DAILY_AI_LIMIT = 10;
async function checkPremium(uid) {
    var _a;
    const userSnap = await admin.firestore().doc(`users/${uid}`).get();
    const user = userSnap.data();
    if (!((_a = user === null || user === void 0 ? void 0 : user.premium) === null || _a === void 0 ? void 0 : _a.isActive)) {
        throw new https_1.HttpsError("permission-denied", "Premium subscription required.");
    }
    if (user.premium.until) {
        const expiry = new Date(user.premium.until);
        if (expiry < new Date()) {
            throw new https_1.HttpsError("permission-denied", "Premium subscription expired.");
        }
    }
}
async function checkRateLimit(uid) {
    var _a, _b;
    const today = new Date().toISOString().split("T")[0];
    const ref = admin.firestore().doc(`users/${uid}/ai_usage/${today}`);
    const snap = await ref.get();
    const count = (_b = (_a = snap.data()) === null || _a === void 0 ? void 0 : _a.count) !== null && _b !== void 0 ? _b : 0;
    if (count >= DAILY_AI_LIMIT) {
        throw new https_1.HttpsError("resource-exhausted", `Daily AI pack limit reached (${DAILY_AI_LIMIT}/day). Try again tomorrow.`);
    }
}
async function incrementUsage(uid) {
    const today = new Date().toISOString().split("T")[0];
    const ref = admin.firestore().doc(`users/${uid}/ai_usage/${today}`);
    await ref.set({ count: admin.firestore.FieldValue.increment(1), date: today }, { merge: true });
}
function buildPrompt(lang, topicHint, minutes) {
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
exports.generateAudio = (0, https_1.onCall)({ enforceAppCheck: false, memory: "512MiB", timeoutSeconds: 180, invoker: "public", secrets: [openaiApiKey] }, async (request) => {
    var _a;
    const { contentId, version, lang, text } = (_a = request.data) !== null && _a !== void 0 ? _a : {};
    if (!contentId || !version || !["pt", "en", "es"].includes(lang) || !(text === null || text === void 0 ? void 0 : text.trim())) {
        throw new https_1.HttpsError("invalid-argument", "contentId, version, lang and text are required.");
    }
    const audioPath = `packs/${contentId}/v${version}/audio/${lang}_gpt.mp3`;
    const bucket = admin.storage().bucket();
    const audioFile = bucket.file(audioPath);
    // Idempotent: if audio already exists, return immediately
    const [exists] = await audioFile.exists();
    if (exists)
        return { storagePath: audioPath };
    // OpenAI TTS limit is 4096 chars per request — split into chunks if needed
    const CHUNK_SIZE = 4000;
    const chunks = [];
    let remaining = text.trim();
    while (remaining.length > 0) {
        if (remaining.length <= CHUNK_SIZE) {
            chunks.push(remaining);
            break;
        }
        // Split at last sentence boundary before CHUNK_SIZE
        let splitAt = remaining.lastIndexOf(". ", CHUNK_SIZE);
        if (splitAt === -1)
            splitAt = CHUNK_SIZE;
        else
            splitAt += 1; // include the period
        chunks.push(remaining.slice(0, splitAt).trim());
        remaining = remaining.slice(splitAt).trim();
    }
    // Call OpenAI TTS tts-1-hd for each chunk, then concatenate
    const openai = new openai_1.default({ apiKey: openaiApiKey.value() });
    const buffers = [];
    for (const chunk of chunks) {
        const response = await openai.audio.speech.create({
            model: "tts-1-hd",
            voice: "onyx",
            input: chunk,
            response_format: "mp3",
        });
        buffers.push(Buffer.from(await response.arrayBuffer()));
    }
    const buffer = Buffer.concat(buffers);
    // Save MP3 to Firebase Storage
    await audioFile.save(buffer, {
        contentType: "audio/mpeg",
        metadata: { cacheControl: "public, max-age=31536000" },
    });
    return { storagePath: audioPath };
});
// ---------------------------------------------------------------------------
// Cloud Function
// ---------------------------------------------------------------------------
exports.generatePack = (0, https_1.onCall)({ enforceAppCheck: false }, async (request) => {
    var _a;
    // 1. Auth
    if (!request.auth) {
        throw new https_1.HttpsError("unauthenticated", "Authentication required.");
    }
    const uid = request.auth.uid;
    // 2. Premium + rate limit (parallel)
    await Promise.all([checkPremium(uid), checkRateLimit(uid)]);
    // 3. Parse input
    const { lang = "pt", topicHint, minutes = 10 } = (_a = request.data) !== null && _a !== void 0 ? _a : {};
    if (!["pt", "en", "es"].includes(lang)) {
        throw new https_1.HttpsError("invalid-argument", "lang must be pt, en, or es.");
    }
    // 4. Generate with Anthropic
    const client = new sdk_1.default();
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
        throw new https_1.HttpsError("internal", "Unexpected response format from AI.");
    }
    // 5. Parse and validate JSON
    let pack;
    try {
        pack = JSON.parse(block.text);
    }
    catch (_b) {
        throw new https_1.HttpsError("internal", "AI returned invalid JSON.");
    }
    if (!pack.id || !pack.lesson || !pack.cards || !pack.quiz) {
        throw new https_1.HttpsError("internal", "AI returned incomplete pack structure.");
    }
    // 6. Stamp source and increment counter
    pack.source = "ai";
    pack.lang = lang;
    await incrementUsage(uid);
    return pack;
});
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
exports.revenuecatWebhook = (0, https_1.onRequest)({ secrets: [rcWebhookSecret] }, async (req, res) => {
    var _a, _b;
    if (req.method !== "POST") {
        res.status(405).send("Method Not Allowed");
        return;
    }
    const authHeader = (_a = req.headers.authorization) !== null && _a !== void 0 ? _a : "";
    if (authHeader !== `Bearer ${rcWebhookSecret.value()}`) {
        res.status(401).send("Unauthorized");
        return;
    }
    const event = (_b = req.body) === null || _b === void 0 ? void 0 : _b.event;
    if (!(event === null || event === void 0 ? void 0 : event.app_user_id)) {
        res.status(400).send("Missing event or app_user_id");
        return;
    }
    const { type, app_user_id, expiration_at_ms } = event;
    const userRef = admin.firestore().doc(`users/${app_user_id}`);
    if (ACTIVATE_EVENTS.has(type)) {
        await userRef.set({
            premium: {
                isActive: true,
                until: expiration_at_ms ? new Date(expiration_at_ms).toISOString() : null,
            },
            updatedAt: Date.now(),
        }, { merge: true });
    }
    else if (DEACTIVATE_EVENTS.has(type)) {
        await userRef.set({
            premium: { isActive: false, until: null },
            updatedAt: Date.now(),
        }, { merge: true });
    }
    res.status(200).send("OK");
});
// ---------------------------------------------------------------------------
// generateWeeklyReports — runs every Monday at 10:00 UTC (07:00 Brasília)
// Generates a personalised AI learning summary for each active premium user
// Saves to: users/{uid}/weekly_reports/{YYYY-WNN}
// ---------------------------------------------------------------------------
function getWeekId(date) {
    // ISO week: YYYY-WNN
    const d = new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()));
    const dayNum = d.getUTCDay() || 7;
    d.setUTCDate(d.getUTCDate() + 4 - dayNum);
    const yearStart = new Date(Date.UTC(d.getUTCFullYear(), 0, 1));
    const weekNo = Math.ceil((((d.getTime() - yearStart.getTime()) / 86400000) + 1) / 7);
    return `${d.getUTCFullYear()}-W${String(weekNo).padStart(2, "0")}`;
}
function buildReportPrompt(lang, weekId, stats) {
    const langName = LANG_NAMES[lang];
    const tracksLine = stats.topTracks.length > 0
        ? `Top tracks studied: ${stats.topTracks.join(", ")}.`
        : "No specific tracks identified.";
    const lessonsLine = stats.lessonTitles.length > 0
        ? `Lessons completed this week: ${stats.lessonTitles.join("; ")}.`
        : "";
    return `You are a learning coach for Lumen, a knowledge app. Write a personalised weekly learning report for a user in ${langName}.

Week: ${weekId}
Sessions completed: ${stats.sessionsCompleted}
Minutes studied: ${stats.minutesStudied}
XP earned: ${stats.xpEarned}
${tracksLine}
${lessonsLine}

Return ONLY valid JSON — no markdown — matching this exact structure:
{
  "headline": "<motivational headline, max 60 chars>",
  "summary": "<2-3 sentences summarising the week's learning effort and achievements>",
  "highlight": "<one specific insight from the lessons studied this week — reference the actual topic>",
  "suggestion": "<one concrete suggestion for what to study next week, based on lessons covered>"
}

Rules:
- All text in ${langName}
- Be warm, specific, and encouraging — like a smart friend reviewing their week
- The highlight must reference something concrete from the lessons, not a generic observation
- Return ONLY the JSON object`;
}
exports.generateWeeklyReports = (0, scheduler_1.onSchedule)({
    schedule: "every monday 10:00",
    timeZone: "UTC",
    secrets: [openaiApiKey],
    memory: "512MiB",
    timeoutSeconds: 540,
}, async () => {
    var _a, _b, _c, _d, _e, _f, _g, _h, _j, _k, _l, _m;
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
    const openai = new openai_1.default({ apiKey: openaiApiKey.value() });
    let generated = 0;
    let skipped = 0;
    for (const userDoc of usersSnap.docs) {
        const uid = userDoc.id;
        const userData = userDoc.data();
        const lang = ["pt", "en", "es"].includes(userData.lang)
            ? userData.lang
            : "pt";
        // Skip if report already exists for this week
        const reportRef = db.doc(`users/${uid}/weekly_reports/${weekId}`);
        const existing = await reportRef.get();
        if (existing.exists) {
            skipped++;
            continue;
        }
        // Read session log — single doc with full history
        const logSnap = await db.doc(`users/${uid}/stats/session_log`).get();
        const allSessions = logSnap.exists ? ((_b = (_a = logSnap.data()) === null || _a === void 0 ? void 0 : _a.sessions) !== null && _b !== void 0 ? _b : []) : [];
        // Filter to past week
        const weeklySessions = allSessions.filter((s) => s.date >= weekStartStr && s.date <= weekEndStr);
        // No activity this week — skip
        if (weeklySessions.length === 0) {
            skipped++;
            continue;
        }
        const minutesStudied = weeklySessions.reduce((sum, s) => { var _a; return sum + ((_a = s.minutes) !== null && _a !== void 0 ? _a : 0); }, 0);
        const sessionsCompleted = weeklySessions.length;
        const trackCounts = {};
        const lessonTitles = [];
        weeklySessions.forEach((s) => {
            var _a;
            if (s.trackId)
                trackCounts[s.trackId] = ((_a = trackCounts[s.trackId]) !== null && _a !== void 0 ? _a : 0) + 1;
            if (s.lessonTitle)
                lessonTitles.push(s.lessonTitle);
        });
        const topTracks = Object.entries(trackCounts)
            .sort(([, a], [, b]) => b - a)
            .slice(0, 3)
            .map(([id]) => id);
        // Mentor: weakest track (lowest avg quiz score) from last 28 days
        const fourWeeksAgoStr = new Date(now.getTime() - 28 * 86400000).toISOString().split("T")[0];
        const trackScores = {};
        allSessions
            .filter((s) => s.date >= fourWeeksAgoStr && s.trackId)
            .forEach((s) => {
            var _a;
            if (!trackScores[s.trackId])
                trackScores[s.trackId] = { total: 0, count: 0 };
            trackScores[s.trackId].total += (_a = s.quizScore) !== null && _a !== void 0 ? _a : 0;
            trackScores[s.trackId].count += 1;
        });
        const mentorTrackId = (_d = (_c = Object.entries(trackScores)
            .filter(([, v]) => v.count >= 2)
            .sort(([, a], [, b]) => (a.total / a.count) - (b.total / b.count))[0]) === null || _c === void 0 ? void 0 : _c[0]) !== null && _d !== void 0 ? _d : null;
        // xpEarned not stored in session_log — read from user doc directly
        const xpEarned = (_e = userData.xp) !== null && _e !== void 0 ? _e : 0;
        const stats = { sessionsCompleted, minutesStudied, xpEarned, topTracks, lessonTitles };
        try {
            const completion = await openai.chat.completions.create({
                model: "gpt-4o-mini",
                max_tokens: 512,
                messages: [{ role: "user", content: buildReportPrompt(lang, weekId, stats) }],
            });
            const raw = (_h = (_g = (_f = completion.choices[0]) === null || _f === void 0 ? void 0 : _f.message) === null || _g === void 0 ? void 0 : _g.content) !== null && _h !== void 0 ? _h : "{}";
            let parsed;
            try {
                parsed = JSON.parse(raw);
            }
            catch (_o) {
                console.error(`[${uid}] Failed to parse AI response:`, raw);
                continue;
            }
            await reportRef.set({
                weekId,
                generatedAt: Date.now(),
                lang,
                headline: (_j = parsed.headline) !== null && _j !== void 0 ? _j : "",
                summary: (_k = parsed.summary) !== null && _k !== void 0 ? _k : "",
                highlight: (_l = parsed.highlight) !== null && _l !== void 0 ? _l : "",
                suggestion: (_m = parsed.suggestion) !== null && _m !== void 0 ? _m : "",
                stats,
                mentorTrackId: mentorTrackId !== null && mentorTrackId !== void 0 ? mentorTrackId : null,
            });
            generated++;
        }
        catch (err) {
            console.error(`[${uid}] Error generating report:`, err);
        }
    }
    console.log(`Weekly reports done — generated: ${generated}, skipped: ${skipped}`);
});
// ---------------------------------------------------------------------------
// generateMonthlyReports — runs on 1st of each month at 10:00 UTC
// Aggregates 4 weeks of data and generates a deeper AI monthly digest
// Saves to: users/{uid}/monthly_reports/{YYYY-MM}
// ---------------------------------------------------------------------------
function buildMonthlyPrompt(lang, monthId, stats) {
    const langName = LANG_NAMES[lang];
    return `You are a learning coach for Lumen. Write a concise monthly learning digest for a user in ${langName}.

Month: ${monthId}
Sessions: ${stats.sessionsCompleted}
Minutes studied: ${stats.minutesStudied}
XP earned: ${stats.xpEarned}
Average quiz score: ${Math.round(stats.avgQuizScore * 100)}%
Top tracks: ${stats.topTracks.join(", ") || "none"}

Return ONLY valid JSON matching this structure:
{
  "headline": "<motivational headline, max 60 chars>",
  "summary": "<2-3 sentences on this month's learning journey>",
  "growth": "<one concrete observation about their progress trend>",
  "challenge": "<one specific challenge or goal for next month>"
}

All text in ${langName}. Return ONLY the JSON object.`;
}
exports.generateMonthlyReports = (0, scheduler_1.onSchedule)({
    schedule: "0 10 1 * *",
    timeZone: "UTC",
    secrets: [openaiApiKey],
    memory: "512MiB",
    timeoutSeconds: 540,
}, async () => {
    var _a, _b, _c, _d, _e, _f, _g, _h, _j, _k;
    const db = admin.firestore();
    const now = new Date();
    const monthId = `${now.getUTCFullYear()}-${String(now.getUTCMonth() + 1).padStart(2, "0")}`;
    // Look back 30 days
    const monthStartStr = new Date(now.getTime() - 30 * 86400000).toISOString().split("T")[0];
    const monthEndStr = new Date(now.getTime() - 86400000).toISOString().split("T")[0];
    const usersSnap = await db.collection("users")
        .where("premium.isActive", "==", true)
        .get();
    if (usersSnap.empty)
        return;
    const openai = new openai_1.default({ apiKey: openaiApiKey.value() });
    let generated = 0;
    for (const userDoc of usersSnap.docs) {
        const uid = userDoc.id;
        const userData = userDoc.data();
        const lang = ["pt", "en", "es"].includes(userData.lang) ? userData.lang : "pt";
        const reportRef = db.doc(`users/${uid}/monthly_reports/${monthId}`);
        if ((await reportRef.get()).exists)
            continue;
        const logSnap = await db.doc(`users/${uid}/stats/session_log`).get();
        const allSessions = logSnap.exists ? ((_b = (_a = logSnap.data()) === null || _a === void 0 ? void 0 : _a.sessions) !== null && _b !== void 0 ? _b : []) : [];
        const monthlySessions = allSessions.filter((s) => s.date >= monthStartStr && s.date <= monthEndStr);
        if (monthlySessions.length === 0)
            continue;
        const minutesStudied = monthlySessions.reduce((sum, s) => { var _a; return sum + ((_a = s.minutes) !== null && _a !== void 0 ? _a : 0); }, 0);
        const sessionsCompleted = monthlySessions.length;
        const totalQuizScore = monthlySessions.reduce((sum, s) => { var _a; return sum + ((_a = s.quizScore) !== null && _a !== void 0 ? _a : 0); }, 0);
        const avgQuizScore = sessionsCompleted > 0 ? totalQuizScore / sessionsCompleted : 0;
        const trackCounts = {};
        monthlySessions.forEach((s) => {
            var _a;
            if (s.trackId)
                trackCounts[s.trackId] = ((_a = trackCounts[s.trackId]) !== null && _a !== void 0 ? _a : 0) + 1;
        });
        const topTracks = Object.entries(trackCounts)
            .sort(([, a], [, b]) => b - a)
            .slice(0, 3)
            .map(([id]) => id);
        const xpEarned = (_c = userData.xp) !== null && _c !== void 0 ? _c : 0;
        const stats = { sessionsCompleted, minutesStudied, xpEarned, topTracks, avgQuizScore };
        try {
            const completion = await openai.chat.completions.create({
                model: "gpt-4o-mini",
                max_tokens: 400,
                messages: [{ role: "user", content: buildMonthlyPrompt(lang, monthId, stats) }],
            });
            const raw = (_f = (_e = (_d = completion.choices[0]) === null || _d === void 0 ? void 0 : _d.message) === null || _e === void 0 ? void 0 : _e.content) !== null && _f !== void 0 ? _f : "{}";
            let parsed;
            try {
                parsed = JSON.parse(raw);
            }
            catch (_l) {
                continue;
            }
            await reportRef.set({
                monthId,
                generatedAt: Date.now(),
                lang,
                headline: (_g = parsed.headline) !== null && _g !== void 0 ? _g : "",
                summary: (_h = parsed.summary) !== null && _h !== void 0 ? _h : "",
                growth: (_j = parsed.growth) !== null && _j !== void 0 ? _j : "",
                challenge: (_k = parsed.challenge) !== null && _k !== void 0 ? _k : "",
                stats,
            });
            generated++;
        }
        catch (err) {
            console.error(`[${uid}] Monthly report error:`, err);
        }
    }
    console.log(`Monthly reports done — generated: ${generated}`);
});
// ---------------------------------------------------------------------------
// generateKnowledgeInsights — runs every Wednesday at 11:00 UTC
// For premium users who've studied 2+ tracks with ≥3 sessions each in the
// last 30 days, generates an AI insight connecting those topics with
// real-world examples. Max 1 new insight per user per week.
// Saves to: users/{uid}/insights/{id}
// ---------------------------------------------------------------------------
function buildInsightPrompt(lang, tracks, lessonTitles) {
    const langName = LANG_NAMES[lang];
    return `You are a knowledge synthesis expert for Lumen, a learning app. A user has recently studied the following topics:

Tracks: ${tracks.join(", ")}
Lessons completed: ${lessonTitles.slice(0, 10).join("; ")}

Your task: write a short, insightful piece that CONNECTS these topics and illustrates them with 3 CONCRETE real-world examples happening today (or in recent history). The examples should be specific — name real events, countries, people, or organizations.

Return ONLY valid JSON matching this structure:
{
  "title": "<compelling title connecting the topics, max 70 chars>",
  "intro": "<2 sentences showing how these topics connect — be specific>",
  "connections": [
    { "headline": "<example title, max 50 chars>", "body": "<2-3 sentences explaining this real-world example and how it connects the topics studied>" },
    { "headline": "<example title>", "body": "<2-3 sentences>" },
    { "headline": "<example title>", "body": "<2-3 sentences>" }
  ],
  "takeaway": "<1 sentence — the key insight the user should walk away with>"
}

Rules:
- All text in ${langName}
- Be specific and factual — avoid vague generalities
- Examples must be real, not hypothetical
- Return ONLY the JSON object`;
}
exports.generateKnowledgeInsights = (0, scheduler_1.onSchedule)({
    schedule: "0 11 * * 3",
    timeZone: "UTC",
    secrets: [openaiApiKey],
    memory: "512MiB",
    timeoutSeconds: 540,
}, async () => {
    var _a, _b, _c, _d, _e, _f, _g, _h;
    const db = admin.firestore();
    const now = new Date();
    const thirtyDaysAgoStr = new Date(now.getTime() - 30 * 86400000).toISOString().split("T")[0];
    const oneWeekAgoMs = now.getTime() - 7 * 86400000;
    const usersSnap = await db.collection("users")
        .where("premium.isActive", "==", true)
        .get();
    if (usersSnap.empty)
        return;
    const openai = new openai_1.default({ apiKey: openaiApiKey.value() });
    let generated = 0;
    for (const userDoc of usersSnap.docs) {
        const uid = userDoc.id;
        const userData = userDoc.data();
        const lang = ["pt", "en", "es"].includes(userData.lang) ? userData.lang : "pt";
        // Skip if user already got an insight this week
        const recentInsight = await db.collection(`users/${uid}/insights`)
            .where("generatedAt", ">", oneWeekAgoMs)
            .limit(1)
            .get();
        if (!recentInsight.empty)
            continue;
        const logSnap = await db.doc(`users/${uid}/stats/session_log`).get();
        const allSessions = logSnap.exists ? ((_b = (_a = logSnap.data()) === null || _a === void 0 ? void 0 : _a.sessions) !== null && _b !== void 0 ? _b : []) : [];
        // Count sessions per track in the last 30 days
        const recentSessions = allSessions.filter((s) => s.date >= thirtyDaysAgoStr);
        const trackCounts = {};
        for (const s of recentSessions) {
            if (!s.trackId)
                continue;
            if (!trackCounts[s.trackId])
                trackCounts[s.trackId] = { count: 0, titles: [] };
            trackCounts[s.trackId].count += 1;
            if (s.lessonTitle && !trackCounts[s.trackId].titles.includes(s.lessonTitle)) {
                trackCounts[s.trackId].titles.push(s.lessonTitle);
            }
        }
        // Need ≥2 tracks with ≥3 sessions each
        const eligibleTracks = Object.entries(trackCounts)
            .filter(([, v]) => v.count >= 3)
            .sort(([, a], [, b]) => b.count - a.count)
            .slice(0, 3);
        if (eligibleTracks.length < 2)
            continue;
        const trackIds = eligibleTracks.map(([id]) => id);
        const allTitles = eligibleTracks.flatMap(([, v]) => v.titles);
        try {
            const completion = await openai.chat.completions.create({
                model: "gpt-4o-mini",
                max_tokens: 700,
                messages: [{ role: "user", content: buildInsightPrompt(lang, trackIds, allTitles) }],
            });
            const raw = (_e = (_d = (_c = completion.choices[0]) === null || _c === void 0 ? void 0 : _c.message) === null || _d === void 0 ? void 0 : _d.content) !== null && _e !== void 0 ? _e : "{}";
            let parsed;
            try {
                parsed = JSON.parse(raw);
            }
            catch (_j) {
                continue;
            }
            if (!parsed.title || !((_f = parsed.connections) === null || _f === void 0 ? void 0 : _f.length))
                continue;
            await db.collection(`users/${uid}/insights`).add({
                generatedAt: Date.now(),
                lang,
                trackIds,
                title: parsed.title,
                intro: (_g = parsed.intro) !== null && _g !== void 0 ? _g : "",
                connections: parsed.connections,
                takeaway: (_h = parsed.takeaway) !== null && _h !== void 0 ? _h : "",
                read: false,
            });
            generated++;
        }
        catch (err) {
            console.error(`[${uid}] Insight error:`, err);
        }
    }
    console.log(`Knowledge insights done — generated: ${generated}`);
});
//# sourceMappingURL=index.js.map