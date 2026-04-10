/**
 * clear-prerequisites.js
 * Sets prerequisites: [] on all lessons in Firestore.
 *
 * Usage:
 *   node scripts/clear-prerequisites.js
 */

const admin = require("firebase-admin");
const path = require("path");

const serviceAccount = require(path.join(__dirname, "serviceAccountKey.json"));

admin.initializeApp({ credential: admin.credential.cert(serviceAccount) });

const db = admin.firestore();

async function main() {
  const snap = await db.collection("lessons").get();
  const batch = db.batch();

  snap.forEach((doc) => {
    batch.update(doc.ref, { prerequisites: [] });
  });

  await batch.commit();
  console.log(`✓ Cleared prerequisites on ${snap.size} lessons`);
  process.exit(0);
}

main().catch((err) => { console.error(err); process.exit(1); });
