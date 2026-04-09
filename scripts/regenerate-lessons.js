/**
 * regenerate-lessons.js
 * Rewrites the lesson.blocks of every pack in Firebase Storage using OpenAI.
 * Preserves quiz, cards, and all metadata — only replaces the lesson content.
 *
 * Target: 10-14 blocks (~450-600 words), ~10-12 min sessions.
 * Structure: intro → historical context → why it matters → real example
 *            → how to apply / critical view → takeaways
 *
 * Strategy: generate lesson in PT, then translate to EN and ES in one call.
 *
 * Usage:
 *   OPENAI_API_KEY=sk-... node scripts/regenerate-lessons.js
 *   OPENAI_API_KEY=sk-... node scripts/regenerate-lessons.js --pack geopolitics
 *   OPENAI_API_KEY=sk-... node scripts/regenerate-lessons.js --pack geopolitics_middle_east --lang pt
 */

const admin = require("firebase-admin");
const OpenAI = require("openai").default;
const path = require("path");

const serviceAccount = require(path.join(__dirname, "serviceAccountKey.json"));

admin.initializeApp({
  credential: admin.credential.cert(serviceAccount),
  storageBucket: "lumen-13d0d.firebasestorage.app",
});

const bucket = admin.storage().bucket();
const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

const CONCURRENCY = 6;

// Parse optional --pack and --lang filters from argv
const args = process.argv.slice(2);
const packFilter = args.includes("--pack") ? args[args.indexOf("--pack") + 1] : null;
const langFilter = args.includes("--lang") ? args[args.indexOf("--lang") + 1] : null;

// ---------------------------------------------------------------------------
// Prompts
// ---------------------------------------------------------------------------

function buildGeneratePrompt(title, currentBlocks) {
  // Extract existing content as context so the AI keeps the same topic/angle
  const existingText = currentBlocks
    .map((b) => (b.type === "bullets" ? b.items.join(". ") : b.text))
    .filter(Boolean)
    .join("\n");

  return `You are writing educational content for Lumen, a mobile learning app in Brazilian Portuguese.

Rewrite the lesson below with more depth and detail. Keep the same topic, title, and core concepts — but expand significantly.

Lesson title: "${title}"
Current content (use as reference for topic/angle, not as a template to follow):
${existingText}

Return ONLY a valid JSON array of blocks, no markdown:
[
  { "type": "h2", "text": "<string>" },
  { "type": "p", "text": "<string>" },
  { "type": "quote", "text": "<string>" },
  { "type": "bullets", "items": ["<string>", "<string>", "<string>"] }
]

Rules:
- Total blocks: 10 to 14
- Required elements:
  - At least 3 h2 section headers (short, descriptive)
  - At least 4 p paragraphs — each 2 to 4 sentences, dense and informative, no filler
  - At least 2 bullets lists with 3 to 4 items each
  - Exactly 1 quote from a relevant author, thinker, or historical figure (attribute it)
- Narrative flow:
  1. Introduce and define the concept clearly
  2. Historical origin or context — when/how did this idea emerge?
  3. Why it matters — real-world implications
  4. Concrete example — a specific event, person, country, or case
  5. How to apply / critical perspective — limitations or nuance
  6. Key takeaways — what to remember
- Each paragraph must add new information — no repetition, no padding
- Language: Brazilian Portuguese
- Return ONLY the JSON array, nothing else`;
}

function buildTranslatePrompt(title, blocksPt) {
  return `Translate the following lesson blocks from Brazilian Portuguese into English (en) and Spanish (es).

Lesson title: "${title}"

Rules:
- Preserve exact JSON structure and all field names (type, text, items)
- Natural, idiomatic translations — not word-for-word
- Translate ALL text values including bullet items
- Keep the same block order

Input (PT):
${JSON.stringify(blocksPt, null, 2)}

Return ONLY a valid JSON object, no markdown:
{
  "en": [ /* same blocks translated to English */ ],
  "es": [ /* same blocks translated to Spanish */ ]
}`;
}

// ---------------------------------------------------------------------------
// Storage helpers
// ---------------------------------------------------------------------------

async function downloadPack(packId, lang) {
  const file = bucket.file(`packs/${packId}/v1/${lang}.json`);
  const [exists] = await file.exists();
  if (!exists) return null;
  const [buf] = await file.download();
  return JSON.parse(buf.toString());
}

async function uploadPack(packId, lang, pack) {
  await bucket.file(`packs/${packId}/v1/${lang}.json`).save(
    JSON.stringify(pack, null, 2),
    { contentType: "application/json", metadata: { cacheControl: "public, max-age=0" } }
  );
}

// ---------------------------------------------------------------------------
// Core logic
// ---------------------------------------------------------------------------

async function regeneratePackLesson(packId, singleLang) {
  const packPt = await downloadPack(packId, "pt");
  if (!packPt) return { pt: "skipped", en: "skipped", es: "skipped" };

  const title = packPt.lesson?.title ?? packId;
  const currentBlocks = packPt.lesson?.blocks ?? [];

  // Step 1: generate new lesson blocks in PT
  const genRes = await openai.chat.completions.create({
    model: "gpt-4o-mini",
    max_tokens: 2048,
    messages: [{ role: "user", content: buildGeneratePrompt(title, currentBlocks) }],
  });

  const raw = genRes.choices[0]?.message?.content?.trim() ?? "[]";
  const blocksPt = JSON.parse(raw);

  if (!Array.isArray(blocksPt) || blocksPt.length < 8) {
    throw new Error(`Expected ≥8 blocks, got ${blocksPt?.length}`);
  }

  // Single-lang mode: only update PT and stop
  if (singleLang === "pt") {
    packPt.lesson.blocks = blocksPt;
    await uploadPack(packId, "pt", packPt);
    return { pt: blocksPt.length, en: "–", es: "–" };
  }

  // Step 2: translate PT → EN + ES in one call
  const transRes = await openai.chat.completions.create({
    model: "gpt-4o-mini",
    max_tokens: 4096,
    messages: [{ role: "user", content: buildTranslatePrompt(title, blocksPt) }],
  });

  const transRaw = transRes.choices[0]?.message?.content?.trim() ?? "{}";
  const translations = JSON.parse(transRaw);
  const blocksEn = translations.en;
  const blocksEs = translations.es;

  if (!Array.isArray(blocksEn) || blocksEn.length < 8) throw new Error(`EN translation too short`);
  if (!Array.isArray(blocksEs) || blocksEs.length < 8) throw new Error(`ES translation too short`);

  // Patch each lang pack (preserving quiz, cards, metadata)
  const [packEn, packEs] = await Promise.all([
    downloadPack(packId, "en"),
    downloadPack(packId, "es"),
  ]);

  packPt.lesson.blocks = blocksPt;

  await Promise.all([
    uploadPack(packId, "pt", packPt),
    packEn
      ? (packEn.lesson.blocks = blocksEn, uploadPack(packId, "en", packEn))
      : Promise.resolve(),
    packEs
      ? (packEs.lesson.blocks = blocksEs, uploadPack(packId, "es", packEs))
      : Promise.resolve(),
  ]);

  return { pt: blocksPt.length, en: blocksEn.length, es: blocksEs.length };
}

// ---------------------------------------------------------------------------
// Main
// ---------------------------------------------------------------------------

async function main() {
  if (!process.env.OPENAI_API_KEY) {
    console.error("Missing OPENAI_API_KEY");
    process.exit(1);
  }

  // List all pack IDs from Storage
  const [files] = await bucket.getFiles({ prefix: "packs/" });
  const allPackIds = [...new Set(
    files
      .map((f) => f.name.match(/^packs\/([^/]+)\//)?.[1])
      .filter(Boolean)
  )];

  // Apply --pack filter (prefix match: "geopolitics" matches all geopolitics_* packs)
  const packIds = packFilter
    ? allPackIds.filter((id) => id === packFilter || id.startsWith(packFilter + "_") || id.startsWith(packFilter))
    : allPackIds;

  console.log(`Regenerating lessons for ${packIds.length} pack(s) (concurrency: ${CONCURRENCY})...\n`);

  let ok = 0, failed = 0;

  for (let i = 0; i < packIds.length; i += CONCURRENCY) {
    const batch = packIds.slice(i, i + CONCURRENCY);
    await Promise.all(batch.map(async (packId) => {
      process.stdout.write(`  ${packId}... `);
      try {
        const result = await regeneratePackLesson(packId, langFilter);
        const summary = Object.entries(result)
          .map(([l, v]) => `${l}:${v === "skipped" || v === "–" ? v : `✓${v}`}`)
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
