/**
 * create-pack.js
 * Creates a new pack: uploads pt/en/es JSONs to Firebase Storage
 * and registers the lesson metadata in Firestore.
 *
 * Usage:
 *   node scripts/create-pack.js --file scripts/tmp_new_pack.json
 *
 * Input file format:
 * {
 *   "id": "history_wwi",
 *   "trackId": "history",
 *   "order": 10,
 *   "difficulty": 2,
 *   "estimatedMinutes": 10,
 *   "prerequisites": ["history"],
 *   "title": { "pt": "...", "en": "...", "es": "..." },
 *   "pt": { "lesson": { "title": "...", "summary": "...", "audioUrl": null, "blocks": [...] }, "cards": [], "quiz": [...] },
 *   "en": { ... },
 *   "es": { ... }
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

const db = admin.firestore();
const bucket = admin.storage().bucket();

const args = process.argv.slice(2);
const filePath = args.includes("--file") ? args[args.indexOf("--file") + 1] : null;

if (!filePath) {
  console.error("Usage: node create-pack.js --file <path>");
  process.exit(1);
}

async function main() {
  const data = JSON.parse(fs.readFileSync(filePath, "utf8"));
  const { id, trackId, order, difficulty, estimatedMinutes, prerequisites } = data;
  const title = data.title ?? { pt: data.titlePt, en: data.titleEn, es: data.titleEs };

  // Upload Storage files for each lang
  for (const lang of ["pt", "en", "es"]) {
    if (!data[lang]) { console.log(`${lang}: skipped`); continue; }

    const packJson = {
      id,
      version: 1,
      lesson: data[lang].lesson,
      cards: data[lang].cards ?? [],
      quiz: data[lang].quiz ?? [],
    };

    await bucket.file(`packs/${id}/v1/${lang}.json`).save(
      JSON.stringify(packJson, null, 2),
      { contentType: "application/json", metadata: { cacheControl: "public, max-age=0" } }
    );
    console.log(`${lang}: ✓ uploaded`);
  }

  // Create Firestore lesson document
  await db.collection("lessons").doc(id).set({
    id,
    trackId,
    version: 1,
    order,
    title,
    estimatedMinutes: estimatedMinutes ?? 10,
    difficulty: difficulty ?? 2,
    prerequisites: prerequisites ?? [],
    coverImageUrl: data.coverImageUrl ?? null,
    coverImageCredit: data.coverImageCredit ?? null,
  });

  console.log(`Firestore: ✓ lessons/${id}`);
  console.log("Done.");
  process.exit(0);
}

main().catch(err => { console.error(err); process.exit(1); });
