/**
 * upload-lesson.js
 * Uploads locally generated lesson blocks to Firebase Storage.
 * Preserves quiz, cards, and all metadata — only replaces lesson.blocks.
 *
 * Usage:
 *   node scripts/upload-lesson.js --pack geopolitics_nato --file /tmp/nato_blocks.json
 *
 * The input file must be a JSON object with pt, en, es arrays of blocks:
 * {
 *   "pt": [ ...blocks ],
 *   "en": [ ...blocks ],
 *   "es": [ ...blocks ]
 * }
 */

const admin = require("firebase-admin");
const path = require("path");
const fs = require("fs");

const serviceAccount = require(path.join(__dirname, "serviceAccountKey.json"));

admin.initializeApp({
  credential: admin.credential.cert(serviceAccount),
  storageBucket: "lumen-13d0d.firebasestorage.app",
});

const bucket = admin.storage().bucket();

const args = process.argv.slice(2);
const packId = args.includes("--pack") ? args[args.indexOf("--pack") + 1] : null;
const filePath = args.includes("--file") ? args[args.indexOf("--file") + 1] : null;

if (!packId || !filePath) {
  console.error("Usage: node upload-lesson.js --pack <id> --file <path>");
  process.exit(1);
}

async function downloadPack(lang) {
  const file = bucket.file(`packs/${packId}/v1/${lang}.json`);
  const [exists] = await file.exists();
  if (!exists) return null;
  const [buf] = await file.download();
  return JSON.parse(buf.toString());
}

async function uploadPack(lang, pack) {
  await bucket.file(`packs/${packId}/v1/${lang}.json`).save(
    JSON.stringify(pack, null, 2),
    { contentType: "application/json", metadata: { cacheControl: "public, max-age=0" } }
  );
}

async function main() {
  const input = JSON.parse(fs.readFileSync(filePath, "utf8"));

  for (const lang of ["pt", "en", "es"]) {
    if (!input[lang]) { console.log(`${lang}: skipped (not in file)`); continue; }

    const pack = await downloadPack(lang);
    if (!pack) { console.log(`${lang}: skipped (not in Storage)`); continue; }

    pack.lesson.blocks = input[lang];
    await uploadPack(lang, pack);
    console.log(`${lang}: ✓ ${input[lang].length} blocks`);
  }

  console.log("Done.");
  process.exit(0);
}

main().catch((err) => { console.error(err); process.exit(1); });
