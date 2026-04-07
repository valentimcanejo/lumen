/**
 * regenerate-quizzes.js
 * Regenerates the quiz section of every pack in Firebase Storage using Claude.
 * Produces exactly 5 questions: 2 definition, 2 application, 1 example.
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

const LANG_NAMES = { pt: "Portuguese (Brazilian)", en: "English", es: "Spanish" };

// Parse optional --pack and --lang filters from argv
const args = process.argv.slice(2);
const packFilter = args.includes("--pack") ? args[args.indexOf("--pack") + 1] : null;
const langFilter = args.includes("--lang") ? args[args.indexOf("--lang") + 1] : null;

function buildQuizPrompt(lang, pack) {
  const langName = LANG_NAMES[lang];
  const lessonText = pack.lesson.blocks
    .map((b) => (b.type === "bullets" ? b.items.join(". ") : b.text))
    .filter(Boolean)
    .join("\n");

  return `You are creating quiz questions for a learning app. Based on the lesson below, generate exactly 5 multiple-choice questions in ${langName}.

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
- All text in ${langName}

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

async function regenerateQuiz(packId, lang) {
  const filePath = `packs/${packId}/v1/${lang}.json`;
  const file = bucket.file(filePath);

  const [exists] = await file.exists();
  if (!exists) return null;

  const [buf] = await file.download();
  const pack = JSON.parse(buf.toString());

  const prompt = buildQuizPrompt(lang, pack);

  const message = await anthropic.messages.create({
    model: "claude-haiku-4-5-20251001",
    max_tokens: 2048,
    messages: [{ role: "user", content: prompt }],
  });

  const text = message.content[0].text.trim();
  const quiz = JSON.parse(text);

  if (!Array.isArray(quiz) || quiz.length !== 5) {
    throw new Error(`Expected 5 questions, got ${quiz?.length}`);
  }

  // Re-assign clean IDs
  quiz.forEach((q, i) => { q.id = `q${i + 1}`; });

  pack.quiz = quiz;

  await file.save(JSON.stringify(pack, null, 2), {
    contentType: "application/json",
    metadata: { cacheControl: "public, max-age=0" },
  });

  return quiz.length;
}

async function main() {
  if (!process.env.ANTHROPIC_API_KEY) {
    console.error("Missing ANTHROPIC_API_KEY");
    process.exit(1);
  }

  // List all pack IDs
  const [files] = await bucket.getFiles({ prefix: "packs/" });
  const packIds = [...new Set(
    files
      .map((f) => f.name.match(/^packs\/([^/]+)\//)?.[1])
      .filter(Boolean)
  )];

  const filtered = packFilter ? packIds.filter((id) => id === packFilter) : packIds;
  const langs = langFilter ? [langFilter] : LANGS;

  console.log(`Regenerating quizzes for ${filtered.length} packs × ${langs.length} langs...\n`);

  let ok = 0, failed = 0;

  for (const packId of filtered) {
    for (const lang of langs) {
      process.stdout.write(`  ${packId} [${lang}]... `);
      try {
        const count = await regenerateQuiz(packId, lang);
        if (count === null) {
          console.log("skipped (file not found)");
        } else {
          console.log(`✓ ${count} questions`);
          ok++;
        }
      } catch (err) {
        console.log(`✗ ${err.message}`);
        failed++;
      }
      // Small delay to avoid rate limits
      await new Promise((r) => setTimeout(r, 300));
    }
  }

  console.log(`\nDone. ${ok} updated, ${failed} failed.`);
  process.exit(0);
}

main();
