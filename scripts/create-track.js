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
    id: "politics",
    order: 8,
    difficulty: 2,
    title: {
      pt: "Política e Democracia",
      en: "Politics and Democracy",
      es: "Política y Democracia",
    },
    description: {
      pt: "Como o poder funciona, por que a democracia importa e o que ameaça — partidos, eleições, populismo, desinformação e o futuro da participação cidadã",
      en: "How power works, why democracy matters and what threatens it — parties, elections, populism, disinformation, and the future of civic participation",
      es: "Cómo funciona el poder, por qué importa la democracia y qué la amenaza — partidos, elecciones, populismo, desinformación y el futuro de la participación ciudadana",
    },
    tags: ["politics", "democracy", "elections", "civil rights"],
  };

  await db.collection("tracks").doc(track.id).set(track);
  console.log(`✓ tracks/${track.id} created`);
  process.exit(0);
}

main().catch(err => { console.error(err); process.exit(1); });
