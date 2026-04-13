/**
 * set-premium-test.js — Seta premium.isActive = true para todos os usuários
 *
 * Uso:
 *   node scripts/set-premium-test.js
 *
 * Para um UID específico:
 *   node scripts/set-premium-test.js <uid>
 */

const admin = require("firebase-admin");
const path = require("path");

const serviceAccount = require(path.join(__dirname, "serviceAccountKey.json"));

admin.initializeApp({
  credential: admin.credential.cert(serviceAccount),
});

const db = admin.firestore();

async function run() {
  const targetUid = process.argv[2] ?? null;

  if (targetUid) {
    await db.doc(`users/${targetUid}`).set(
      { premium: { isActive: true, until: null } },
      { merge: true }
    );
    console.log(`✅ premium.isActive = true → users/${targetUid}`);
    return;
  }

  // Sem UID: aplica para todos os usuários
  const snap = await db.collection("users").get();
  if (snap.empty) {
    console.log("Nenhum usuário encontrado.");
    return;
  }

  const batch = db.batch();
  snap.docs.forEach((doc) => {
    batch.set(doc.ref, { premium: { isActive: true, until: null } }, { merge: true });
  });
  await batch.commit();

  console.log(`✅ premium.isActive = true → ${snap.size} usuário(s)`);
  snap.docs.forEach((doc) => console.log(`   ${doc.id}`));
}

run().catch(console.error).finally(() => process.exit());
