/**
 * set-lesson-tiers.js — Atualiza o campo `tier` de lições no Firestore.
 *
 * Uso:
 *   node scripts/set-lesson-tiers.js --premium <id1,id2,...>
 *   node scripts/set-lesson-tiers.js --free <id1,id2,...>
 *   node scripts/set-lesson-tiers.js --list        (lista todas as lições com seu tier atual)
 *
 * Exemplos:
 *   node scripts/set-lesson-tiers.js --list
 *   node scripts/set-lesson-tiers.js --premium foundations_advanced,economics_advanced
 */

const admin = require("firebase-admin");
const path = require("path");

const serviceAccount = require(path.join(__dirname, "serviceAccountKey.json"));

admin.initializeApp({
  credential: admin.credential.cert(serviceAccount),
});

const db = admin.firestore();

const args = process.argv.slice(2);

async function run() {
  const snap = await db.collection("lessons").orderBy("trackId").orderBy("order").get();

  if (args.includes("--list")) {
    console.log(`\n${"ID".padEnd(45)} ${"Track".padEnd(20)} ${"Order".padEnd(6)} Tier`);
    console.log("-".repeat(85));
    snap.docs.forEach((doc) => {
      const d = doc.data();
      const tier = d.tier ?? "free (implicit)";
      console.log(`${doc.id.padEnd(45)} ${(d.trackId ?? "").padEnd(20)} ${String(d.order ?? "").padEnd(6)} ${tier}`);
    });
    console.log(`\nTotal: ${snap.size} lições`);
    return;
  }

  const premiumIdx = args.indexOf("--premium");
  const freeIdx = args.indexOf("--free");

  if (premiumIdx === -1 && freeIdx === -1) {
    console.error("Uso: --list | --premium <ids> | --free <ids>");
    process.exit(1);
  }

  const targetTier = premiumIdx !== -1 ? "premium" : "free";
  const rawIds = args[premiumIdx !== -1 ? premiumIdx + 1 : freeIdx + 1];

  if (!rawIds) {
    console.error(`Forneça os IDs após --${targetTier}, separados por vírgula.`);
    process.exit(1);
  }

  const ids = rawIds.split(",").map((s) => s.trim()).filter(Boolean);
  const existing = new Set(snap.docs.map((d) => d.id));

  const missing = ids.filter((id) => !existing.has(id));
  if (missing.length > 0) {
    console.warn(`\n⚠️  IDs não encontrados no Firestore:\n${missing.map((id) => `  - ${id}`).join("\n")}`);
  }

  const toUpdate = ids.filter((id) => existing.has(id));
  if (toUpdate.length === 0) {
    console.log("Nada a atualizar.");
    return;
  }

  const batch = db.batch();
  toUpdate.forEach((id) => {
    batch.update(db.collection("lessons").doc(id), { tier: targetTier });
  });
  await batch.commit();

  console.log(`\n✅ tier = "${targetTier}" aplicado em ${toUpdate.length} lição(ões):`);
  toUpdate.forEach((id) => console.log(`   ${id}`));
}

run().catch(console.error).finally(() => process.exit());
