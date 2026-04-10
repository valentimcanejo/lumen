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
    id: "business",
    order: 10,
    difficulty: 2,
    title: {
      pt: "Negócios e Empreendedorismo",
      en: "Business and Entrepreneurship",
      es: "Negocios y Emprendimiento",
    },
    description: {
      pt: "De Schumpeter ao Vale do Silício — como empreendedores criam valor, como empresas crescem e competem, e as forças que estão transformando o trabalho no século XXI",
      en: "From Schumpeter to Silicon Valley — how entrepreneurs create value, how companies grow and compete, and the forces transforming work in the 21st century",
      es: "De Schumpeter a Silicon Valley — cómo los emprendedores crean valor, cómo las empresas crecen y compiten, y las fuerzas que están transformando el trabajo en el siglo XXI",
    },
    tags: ["business", "entrepreneurship", "startups", "strategy", "finance"],
  };

  await db.collection("tracks").doc(track.id).set(track);
  console.log(`✓ tracks/${track.id} created`);
  process.exit(0);
}

main().catch(err => { console.error(err); process.exit(1); });
