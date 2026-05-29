/**
 * create-track.js
 * Creates a track document in Firestore.
 *
 * Usage:
 *   node scripts/create-track.js
 */

const admin = require("firebase-admin");
const path = require("path");

const serviceAccount = require(path.join(__dirname, "serviceAccountKey.json"));

admin.initializeApp({
  credential: admin.credential.cert(serviceAccount),
});

const db = admin.firestore();

async function main() {
  const track = {
    id: "health",
    order: 12,
    difficulty: 2,
    title: {
      pt: "Saúde",
      en: "Health",
      es: "Salud",
    },
    description: {
      pt: "Do sono ao câncer, do coração ao microbioma — entenda como seu corpo funciona e o que a ciência diz sobre viver mais e melhor",
      en: "From sleep to cancer, from the heart to the microbiome — understand how your body works and what science says about living longer and better",
      es: "Del sueño al cáncer, del corazón al microbioma — entiende cómo funciona tu cuerpo y qué dice la ciencia sobre vivir más y mejor",
    },
    tags: ["health", "medicine", "biology", "wellness", "science"],
  };

  await db.collection("tracks").doc(track.id).set(track);
  console.log(`✓ tracks/${track.id} created`);
  process.exit(0);
}

main().catch(err => { console.error(err); process.exit(1); });
