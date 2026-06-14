/**
 * check-new-tracks.js
 * Verifica se as trilhas cosmos/health (e suas lições) existem no Firestore
 * e se os packs correspondentes existem no Storage (pt/en/es).
 *
 * node scripts/check-new-tracks.js
 */
const admin = require("firebase-admin");
const path = require("path");
const serviceAccount = require(path.join(__dirname, "serviceAccountKey.json"));

admin.initializeApp({
  credential: admin.credential.cert(serviceAccount),
  storageBucket: "lumen-13d0d.firebasestorage.app",
});
const db = admin.firestore();
const bucket = admin.storage().bucket();

const LESSON_IDS = {
  cosmos: [
    "cosmos", "cosmos_what_is_life", "cosmos_origin_of_life", "cosmos_habitable_zone",
    "cosmos_solar_system_life", "cosmos_exoplanets", "cosmos_drake_equation",
    "cosmos_seti", "cosmos_fermi_paradox", "cosmos_impact",
  ],
  health: [
    "health", "health_sleep", "health_heart_stroke", "health_blood_tests",
    "health_hypertension", "health_immune_system", "health_cancer",
    "health_mental_health", "health_nutrition", "health_exercise",
  ],
};
const LANGS = ["pt", "en", "es"];
const VERSION = 1;

async function main() {
  for (const trackId of Object.keys(LESSON_IDS)) {
    console.log(`\n=== track: ${trackId} ===`);
    const trackDoc = await db.collection("tracks").doc(trackId).get();
    console.log(`  Firestore tracks/${trackId}: ${trackDoc.exists ? "EXISTS" : "MISSING"}`);

    for (const lessonId of LESSON_IDS[trackId]) {
      const lessonDoc = await db.collection("lessons").doc(lessonId).get();
      const status = lessonDoc.exists ? lessonDoc.data().status : "MISSING";
      const storageStatus = [];
      for (const lang of LANGS) {
        const file = bucket.file(`packs/${lessonId}/v${VERSION}/${lang}.json`);
        const [exists] = await file.exists();
        storageStatus.push(`${lang}:${exists ? "ok" : "MISSING"}`);
      }
      console.log(`  ${lessonId} -> firestore: ${status} | storage: ${storageStatus.join(", ")}`);
    }
  }
  process.exit(0);
}

main().catch((e) => { console.error(e); process.exit(1); });
