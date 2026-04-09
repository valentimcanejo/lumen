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
exports.revenuecatWebhook = exports.generatePack = exports.generateAudio = void 0;
const https_1 = require("firebase-functions/v2/https");
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
exports.generateAudio = (0, https_1.onCall)({ enforceAppCheck: false, memory: "512MiB", invoker: "public", secrets: [openaiApiKey] }, async (request) => {
    var _a;
    const { contentId, version, lang, text } = (_a = request.data) !== null && _a !== void 0 ? _a : {};
    if (!contentId || !version || !["pt", "en", "es"].includes(lang) || !(text === null || text === void 0 ? void 0 : text.trim())) {
        throw new https_1.HttpsError("invalid-argument", "contentId, version, lang and text are required.");
    }
    if (text.length > 10000) {
        throw new https_1.HttpsError("invalid-argument", "text exceeds maximum length of 10,000 characters.");
    }
    const audioPath = `packs/${contentId}/v${version}/audio/${lang}_gpt.mp3`;
    const bucket = admin.storage().bucket();
    const audioFile = bucket.file(audioPath);
    // Idempotent: if audio already exists, return immediately
    const [exists] = await audioFile.exists();
    if (exists)
        return { storagePath: audioPath };
    // Call OpenAI TTS tts-1-hd
    const openai = new openai_1.default({ apiKey: openaiApiKey.value() });
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
//# sourceMappingURL=index.js.map