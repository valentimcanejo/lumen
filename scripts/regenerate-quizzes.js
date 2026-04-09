/**
 * regenerate-quizzes.js
 * Regenerates the quiz section of every pack in Firebase Storage using Claude.
 * Produces exactly 5 questions: 2 definition, 2 application, 1 example.
 *
 * Strategy: generate quiz in PT, then translate to EN and ES in one call.
 * This reduces 3 large API calls (full lesson) to 1 generation + 1 translation per pack.
 *
 * Usage:
 *   ANTHROPIC_API_KEY=sk-... node scripts/regenerate-quizzes.js
 *   ANTHROPIC_API_KEY=sk-... node scripts/regenerate-quizzes.js --pack geopolitics --lang pt
 */

const admin = require("firebase-admin");
const Anthropic = require("@anthropic-ai/sdk");
const path = require("path");

const serviceAccount = require(path.join(__dirname, "serviceAccountKey.json"));

admin.initializeApp({
  credential: admin.credential.cert(serviceAccount),
  storageBucket: "lumen-13d0d.firebasestorage.app",
});

const bucket = admin.storage().bucket();
const anthropic = new Anthropic.default({ apiKey: process.env.ANTHROPIC_API_KEY });

const LANGS = ["pt", "en", "es"];
const CONCURRENCY = 8;

// Parse optional --pack and --lang filters from argv
const args = process.argv.slice(2);
const packFilter = args.includes("--pack") ? args[args.indexOf("--pack") + 1] : null;
const langFilter = args.includes("--lang") ? args[args.indexOf("--lang") + 1] : null;

function buildGeneratePrompt(pack) {
  const lessonText = pack.lesson.blocks
    .map((b) => (b.type === "bullets" ? b.items.join(". ") : b.text))
    .filter(Boolean)
    .join("\n");

  return `You are creating quiz questions for a learning app. Based on the lesson below, generate exactly 5 multiple-choice questions in Brazilian Portuguese.

Lesson title: ${pack.lesson.title}
Lesson content:
${lessonText}

Question type distribution (in this exact order):
1. Definition question — test recall of a key concept ("What is X?", "What does X mean?")
2. Definition question — test another key concept from the lesson
3. Application question — test understanding in context ("In which situation would X apply?", "What would happen if X?")
4. Application question — another application scenario
5. Example question — test recognition ("Which of these is an example of X?")

Rules:
- 4 options per question
- Vary the correct answer position — do NOT always use index 0 or 1
- Each explanation adds insight beyond restating the answer (1–2 sentences)
- All text in Brazilian Portuguese

Return ONLY a valid JSON array, no markdown:
[
  {
    "id": "q1",
    "question": "<string>",
    "options": ["<opt0>", "<opt1>", "<opt2>", "<opt3>"],
    "answerIndex": <0|1|2|3>,
    "explanation": "<string>"
  },
  ...
]`;
}

function buildTranslatePrompt(quizPt) {
  return `Translate the following quiz JSON from Brazilian Portuguese into English (en) and Spanish (es).

Rules:
- Preserve exact JSON structure and all field names
- Keep answerIndex values unchanged
- Natural, idiomatic translations — not word-for-word
- All question/option/explanation text must be translated

Input (PT):
${JSON.stringify(quizPt, null, 2)}

Return ONLY a valid JSON object, no markdown:
{
  "en": [ /* same structure, translated to English */ ],
  "es": [ /* same structure, translated to Spanish */ ]
}`;
}

async function downloadPack(packId, lang) {
  const file = bucket.file(`packs/${packId}/v1/${lang}.json`);
  const [exists] = await file.exists();
  if (!exists) return null;
  const [buf] = await file.download();
  return JSON.parse(buf.toString());
}

async function uploadPack(packId, lang, pack) {
  await bucket.file(`packs/${packId}/v1/${lang}.json`).save(JSON.stringify(pack, null, 2), {
    contentType: "application/json",
    metadata: { cacheControl: "public, max-age=0" },
  });
}

async function regeneratePackQuizzes(packId, langs) {
  // Single-lang mode (--lang filter): fall back to direct generation for that lang
  if (langs.length === 1) {
    const lang = langs[0];
    const pack = await downloadPack(packId, lang);
    if (!pack) return { [lang]: "skipped" };

    const prompt = buildGeneratePrompt(pack);
    const langName = { pt: "Brazilian Portuguese", en: "English", es: "Spanish" }[lang];
    const singleLangPrompt = prompt.replace(/Brazilian Portuguese/g, langName);

    const msg = await anthropic.messages.create({
      model: "claude-haiku-4-5-20251001",
      max_tokens: 2048,
      messages: [{ role: "user", content: singleLangPrompt }],
    });

    const quiz = JSON.parse(msg.content[0].text.trim());
    if (!Array.isArray(quiz) || quiz.length !== 5) {
      throw new Error(`Expected 5 questions, got ${quiz?.length}`);
    }
    quiz.forEach((q, i) => { q.id = `q${i + 1}`; });
    pack.quiz = quiz;
    await uploadPack(packId, lang, pack);
    return { [lang]: quiz.length };
  }

  // Full mode: generate in PT, translate to EN+ES
  const packPt = await downloadPack(packId, "pt");
  if (!packPt) return { pt: "skipped", en: "skipped", es: "skipped" };

  // Step 1: generate quiz in PT
  const genMsg = await anthropic.messages.create({
    model: "claude-haiku-4-5-20251001",
    max_tokens: 2048,
    messages: [{ role: "user", content: buildGeneratePrompt(packPt) }],
  });

  const quizPt = JSON.parse(genMsg.content[0].text.trim());
  if (!Array.isArray(quizPt) || quizPt.length !== 5) {
    throw new Error(`Expected 5 PT questions, got ${quizPt?.length}`);
  }
  quizPt.forEach((q, i) => { q.id = `q${i + 1}`; });

  // Step 2: translate PT → EN + ES in one call
  const transMsg = await anthropic.messages.create({
    model: "claude-haiku-4-5-20251001",
    max_tokens: 4096,
    messages: [{ role: "user", content: buildTranslatePrompt(quizPt) }],
  });

  const translations = JSON.parse(transMsg.content[0].text.trim());
  const quizEn = translations.en;
  const quizEs = translations.es;

  if (!Array.isArray(quizEn) || quizEn.length !== 5) throw new Error(`Expected 5 EN questions`);
  if (!Array.isArray(quizEs) || quizEs.length !== 5) throw new Error(`Expected 5 ES questions`);

  quizEn.forEach((q, i) => { q.id = `q${i + 1}`; });
  quizEs.forEach((q, i) => { q.id = `q${i + 1}`; });

  // Upload all three langs concurrently
  const [packEn, packEs] = await Promise.all([
    downloadPack(packId, "en"),
    downloadPack(packId, "es"),
  ]);

  packPt.quiz = quizPt;
  await Promise.all([
    uploadPack(packId, "pt", packPt),
    packEn ? (packEn.quiz = quizEn, uploadPack(packId, "en", packEn)) : Promise.resolve(),
    packEs ? (packEs.quiz = quizEs, uploadPack(packId, "es", packEs)) : Promise.resolve(),
  ]);

  return { pt: quizPt.length, en: quizEn.length, es: quizEs.length };
}

async function main() {
  if (!process.env.ANTHROPIC_API_KEY) {
    console.error("Missing ANTHROPIC_API_KEY");
    process.exit(1);
  }

  const [files] = await bucket.getFiles({ prefix: "packs/" });
  const packIds = [...new Set(
    files
      .map((f) => f.name.match(/^packs\/([^/]+)\//)?.[1])
      .filter(Boolean)
  )];

  const filtered = packFilter ? packIds.filter((id) => id === packFilter) : packIds;
  const langs = langFilter ? [langFilter] : LANGS;

  console.log(`Regenerating quizzes for ${filtered.length} packs (concurrency: ${CONCURRENCY})...\n`);

  let ok = 0, failed = 0;

  // Process in batches of CONCURRENCY
  for (let i = 0; i < filtered.length; i += CONCURRENCY) {
    const batch = filtered.slice(i, i + CONCURRENCY);
    await Promise.all(batch.map(async (packId) => {
      process.stdout.write(`  ${packId}... `);
      try {
        const result = await regeneratePackQuizzes(packId, langs);
        const summary = Object.entries(result)
          .map(([l, v]) => `${l}:${v === "skipped" ? "–" : `✓${v}`}`)
          .join(" ");
        console.log(summary);
        ok++;
      } catch (err) {
        console.log(`✗ ${err.message}`);
        failed++;
      }
    }));
  }

  console.log(`\nDone. ${ok} updated, ${failed} failed.`);
  process.exit(0);
}

main();
