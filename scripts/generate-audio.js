/**
 * generate-audio.js
 * Pre-generates GPT audio for all packs in Firebase Storage.
 * Skips packs that already have a {lang}_gpt.mp3 file.
 *
 * Usage:
 *   OPENAI_API_KEY=sk-... node scripts/generate-audio.js
 *   OPENAI_API_KEY=sk-... node scripts/generate-audio.js --pack geopolitics --lang pt
 */

const admin = require("firebase-admin");
const path = require("path");
const { OpenAI } = require("openai");

const serviceAccount = require(path.join(__dirname, "serviceAccountKey.json"));

admin.initializeApp({
  credential: admin.credential.cert(serviceAccount),
  storageBucket: "lumen-13d0d.firebasestorage.app",
});

const bucket = admin.storage().bucket();

const LANGS = ["pt", "en", "es"];
const CONCURRENCY = 4; // OpenAI TTS has rate limits — keep conservative

const args = process.argv.slice(2);
const packFilter = args.includes("--pack") ? args[args.indexOf("--pack") + 1] : null;
const langFilter = args.includes("--lang") ? args[args.indexOf("--lang") + 1] : null;

function extractText(blocks) {
  return blocks
    .map((b) => (b.type === "bullets" ? b.items.join(". ") : b.text))
    .filter(Boolean)
    .join("\n");
}

async function generateOne(packId, lang, openai) {
  const audioPath = `packs/${packId}/v1/audio/${lang}_gpt.mp3`;
  const audioFile = bucket.file(audioPath);

  // Skip if already exists
  const [exists] = await audioFile.exists();
  if (exists) return "skipped";

  // Load pack from Storage to extract lesson text
  const packFile = bucket.file(`packs/${packId}/v1/${lang}.json`);
  const [packExists] = await packFile.exists();
  if (!packExists) return "no_pack";

  const [buf] = await packFile.download();
  const pack = JSON.parse(buf.toString());
  const text = extractText(pack.lesson.blocks);

  if (!text.trim()) return "no_text";

  // Generate with OpenAI tts-1-hd
  const response = await openai.audio.speech.create({
    model: "tts-1-hd",
    voice: "onyx",
    input: text,
    response_format: "mp3",
  });

  const buffer = Buffer.from(await response.arrayBuffer());

  await audioFile.save(buffer, {
    contentType: "audio/mpeg",
    metadata: { cacheControl: "public, max-age=31536000" },
  });

  return "generated";
}

async function main() {
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) {
    console.error("Missing OPENAI_API_KEY");
    process.exit(1);
  }

  const openai = new OpenAI({ apiKey });

  // Discover all pack IDs from Storage
  const [files] = await bucket.getFiles({ prefix: "packs/" });
  const packIds = [...new Set(
    files
      .map((f) => f.name.match(/^packs\/([^/]+)\//)?.[1])
      .filter(Boolean)
  )];

  const filtered = packFilter ? packIds.filter((id) => id === packFilter) : packIds;
  const langs = langFilter ? [langFilter] : LANGS;

  // Build flat list of jobs
  const jobs = filtered.flatMap((packId) => langs.map((lang) => ({ packId, lang })));
  console.log(`Generating audio for ${filtered.length} packs × ${langs.length} langs = ${jobs.length} files...\n`);

  let generated = 0, skipped = 0, failed = 0;

  // Process in batches of CONCURRENCY
  for (let i = 0; i < jobs.length; i += CONCURRENCY) {
    const batch = jobs.slice(i, i + CONCURRENCY);
    await Promise.all(batch.map(async ({ packId, lang }) => {
      process.stdout.write(`  ${packId} [${lang}]... `);
      try {
        const result = await generateOne(packId, lang, openai);
        if (result === "skipped") { console.log("skipped"); skipped++; }
        else if (result === "no_pack") { console.log("skipped (no pack)"); skipped++; }
        else if (result === "no_text") { console.log("skipped (no text)"); skipped++; }
        else { console.log("✓"); generated++; }
      } catch (err) {
        console.log(`✗ ${err.message}`);
        failed++;
      }
    }));
  }

  console.log(`\nDone. ${generated} generated, ${skipped} skipped, ${failed} failed.`);
  process.exit(0);
}

main();
