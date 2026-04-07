/**
 * dump-lessons.js
 * Downloads all pack JSON from Firebase Storage and prints lesson content only.
 * Run from scripts/ or with: node scripts/dump-lessons.js
 */

const admin = require("firebase-admin");
const path = require("path");

const serviceAccount = require(path.join(__dirname, "serviceAccountKey.json"));

admin.initializeApp({
  credential: admin.credential.cert(serviceAccount),
  storageBucket: "lumen-13d0d.firebasestorage.app",
});

const bucket = admin.storage().bucket();

const PACKS = [
  "critical_thinking","critical_thinking_bias","critical_thinking_fallacies",
  "critical_thinking_rhetoric","critical_thinking_scientific",
  "economics","economics_inflation","economics_interest_rates","economics_trade",
  "foundations","foundations_first_principles","foundations_mental_models","foundations_probabilistic",
  "geopolitics","geopolitics_brics","geopolitics_china_usa","geopolitics_middle_east","geopolitics_nato",
  "history","history_cold_war","history_colonialism","history_industrial_revolution","history_wwii",
  "psychology","psychology_emotions","psychology_habits","psychology_resilience","psychology_social"
];

const LANGS = ["pt", "en", "es"];

async function main() {
  const result = {};

  for (const packId of PACKS) {
    result[packId] = {};
    for (const lang of LANGS) {
      const filePath = `packs/${packId}/v1/${lang}.json`;
      const file = bucket.file(filePath);
      const [exists] = await file.exists();
      if (!exists) {
        result[packId][lang] = null;
        continue;
      }
      const [buf] = await file.download();
      const pack = JSON.parse(buf.toString());
      // Only keep what we need for quiz generation
      result[packId][lang] = {
        title: pack.lesson.title,
        blocks: pack.lesson.blocks,
        currentQuizCount: pack.quiz ? pack.quiz.length : 0,
      };
    }
  }

  process.stdout.write(JSON.stringify(result, null, 2));
  process.exit(0);
}

main().catch(e => { console.error(e); process.exit(1); });
