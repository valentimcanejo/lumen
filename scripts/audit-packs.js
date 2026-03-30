/**
 * audit-packs.js
 * Verifica se todos os packs no Firebase Storage têm:
 *   - 5 flashcards
 *   - 5 questões no quiz
 *
 * node scripts/audit-packs.js
 */
const admin = require("firebase-admin");
const path = require("path");
const serviceAccount = require(path.join(__dirname, "serviceAccountKey.json"));

admin.initializeApp({
  credential: admin.credential.cert(serviceAccount),
  storageBucket: "lumen-13d0d.firebasestorage.app",
});
const bucket = admin.storage().bucket();

const TRACKS = [
  "foundations", "foundations_mental_models", "foundations_first_principles",
  "foundations_decision_making", "foundations_probabilistic",
  "geopolitics", "geopolitics_nato", "geopolitics_brics",
  "geopolitics_middle_east", "geopolitics_china_usa",
  "economics", "economics_inflation", "economics_interest_rates",
  "economics_fiscal_policy", "economics_trade",
  "critical_thinking", "critical_thinking_fallacies", "critical_thinking_bias",
  "critical_thinking_scientific", "critical_thinking_rhetoric",
  "history", "history_wwii", "history_cold_war",
  "history_colonialism", "history_industrial_revolution",
  "psychology", "psychology_emotions", "psychology_habits",
  "psychology_social", "psychology_resilience",
];
const LANGS = ["pt", "en", "es"];
const VERSION = 1;

async function fetchPack(id, lang) {
  const filePath = `packs/${id}/v${VERSION}/${lang}.json`;
  const file = bucket.file(filePath);
  const [contents] = await file.download();
  return JSON.parse(contents.toString());
}

async function main() {
  const issues = [];
  const ok = [];

  for (const id of TRACKS) {
    for (const lang of LANGS) {
      try {
        const pack = await fetchPack(id, lang);
        const cards = pack.cards?.length ?? 0;
        const quiz = pack.quiz?.length ?? 0;
        const label = `${id}/${lang}`;

        if (cards !== 5 || quiz !== 5) {
          issues.push({ label, cards, quiz });
        } else {
          ok.push(label);
        }
      } catch (e) {
        issues.push({ label: `${id}/${lang}`, error: e.message });
      }
    }
  }

  console.log(`\n✅ OK: ${ok.length}/${TRACKS.length * LANGS.length} packs\n`);

  if (issues.length === 0) {
    console.log("Todos os packs estão corretos.");
  } else {
    console.log(`❌ Problemas encontrados (${issues.length}):\n`);
    for (const issue of issues) {
      if (issue.error) {
        console.log(`  ${issue.label} → ERRO: ${issue.error}`);
      } else {
        console.log(`  ${issue.label} → cards: ${issue.cards}, quiz: ${issue.quiz}`);
      }
    }
  }

  process.exit(0);
}

main().catch((e) => { console.error(e); process.exit(1); });
