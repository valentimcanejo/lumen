/**
 * upload-quizzes.js
 * Applies quiz patches from quiz-patches.js to all packs in Firebase Storage.
 * Run from functions/ dir (has firebase-admin in node_modules):
 *   node ../scripts/upload-quizzes.js
 */

const admin = require("firebase-admin");
const path = require("path");
const patches = require("./quiz-patches");

const serviceAccount = require(path.join(__dirname, "serviceAccountKey.json"));
admin.initializeApp({
  credential: admin.credential.cert(serviceAccount),
  storageBucket: "lumen-13d0d.firebasestorage.app",
});

const bucket = admin.storage().bucket();
const LANGS = ["pt", "en", "es"];

async function main() {
  let ok = 0, skipped = 0, failed = 0;
  const packIds = Object.keys(patches);
  console.log(`Uploading quizzes for ${packIds.length} packs × ${LANGS.length} langs...\n`);

  for (const packId of packIds) {
    for (const lang of LANGS) {
      const quiz = patches[packId]?.[lang];
      if (!quiz || quiz.length !== 5) {
        console.log(`  ${packId} [${lang}] skipped (no patch)`);
        skipped++;
        continue;
      }

      const filePath = `packs/${packId}/v1/${lang}.json`;
      const file = bucket.file(filePath);
      const [exists] = await file.exists();
      if (!exists) {
        console.log(`  ${packId} [${lang}] skipped (file not found in storage)`);
        skipped++;
        continue;
      }

      const [buf] = await file.download();
      const pack = JSON.parse(buf.toString());

      // Re-assign clean IDs
      quiz.forEach((q, i) => { q.id = `q${i + 1}`; });
      pack.quiz = quiz;

      await file.save(JSON.stringify(pack, null, 2), {
        contentType: "application/json",
        metadata: { cacheControl: "public, max-age=0" },
      });

      console.log(`  ${packId} [${lang}] ✓`);
      ok++;

      await new Promise(r => setTimeout(r, 200));
    }
  }

  console.log(`\nDone. ${ok} updated, ${skipped} skipped, ${failed} failed.`);
  process.exit(0);
}

main().catch(e => { console.error(e); process.exit(1); });
