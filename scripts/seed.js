/**
 * Lumen — Seed Script
 *
 * Popula o Firestore e o Firebase Storage com dados iniciais.
 *
 * Como usar:
 *   1. Vá em Firebase Console > Project Settings > Service Accounts
 *   2. Clique em "Generate new private key" e salve como serviceAccountKey.json
 *      nesta pasta (scripts/)
 *   3. npm install firebase-admin
 *   4. node scripts/seed.js
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

// ─── GOALS ────────────────────────────────────────────────────────────────────

const GOALS = [
  {
    id: "critical_thinking",
    order: 1,
    icon: "brain",
    color: "#F5C77A",
    isActive: true,
    title: {
      pt: "Pensamento crítico",
      en: "Critical thinking",
      es: "Pensamiento crítico",
    },
    description: {
      pt: "Analisar ideias, argumentos e informações com profundidade",
      en: "Analyze ideas, arguments and information deeply",
      es: "Analizar ideas, argumentos e información en profundidad",
    },
    tags: ["logic", "argumentation", "bias"],
  },
  {
    id: "geopolitics",
    order: 2,
    icon: "globe",
    color: "#5ED19A",
    isActive: true,
    title: {
      pt: "Geopolítica",
      en: "Geopolitics",
      es: "Geopolítica",
    },
    description: {
      pt: "Entender as relações de poder entre países e regiões",
      en: "Understand power relations between countries and regions",
      es: "Entender las relaciones de poder entre países y regiones",
    },
    tags: ["power", "diplomacy", "international"],
  },
  {
    id: "economics",
    order: 3,
    icon: "chart",
    color: "#AAB0C0",
    isActive: true,
    title: {
      pt: "Economia",
      en: "Economics",
      es: "Economía",
    },
    description: {
      pt: "Compreender como mercados, dinheiro e decisões moldam o mundo",
      en: "Understand how markets, money and decisions shape the world",
      es: "Comprender cómo los mercados, el dinero y las decisiones moldean el mundo",
    },
    tags: ["markets", "finance", "policy"],
  },
];

// ─── TRACKS ───────────────────────────────────────────────────────────────────

const TRACKS = [
  {
    id: "foundations",
    order: 1,
    difficulty: 1,
    title: {
      pt: "Fundamentos",
      en: "Foundations",
      es: "Fundamentos",
    },
    description: {
      pt: "Conceitos essenciais para entender o mundo moderno",
      en: "Essential concepts to understand the modern world",
      es: "Conceptos esenciales para entender el mundo moderno",
    },
    tags: ["intro", "essentials"],
  },
  {
    id: "geopolitics",
    order: 2,
    difficulty: 2,
    title: {
      pt: "Geopolítica",
      en: "Geopolitics",
      es: "Geopolítica",
    },
    description: {
      pt: "Poder, conflito e diplomacia no cenário internacional",
      en: "Power, conflict and diplomacy in the international arena",
      es: "Poder, conflicto y diplomacia en el escenario internacional",
    },
    tags: ["power", "diplomacy", "war", "alliances"],
  },
  {
    id: "economics",
    order: 3,
    difficulty: 2,
    title: {
      pt: "Economia",
      en: "Economics",
      es: "Economía",
    },
    description: {
      pt: "Mercados, política monetária e sistemas econômicos",
      en: "Markets, monetary policy and economic systems",
      es: "Mercados, política monetaria y sistemas económicos",
    },
    tags: ["markets", "finance", "trade"],
  },
  {
    id: "critical_thinking",
    order: 4,
    difficulty: 2,
    title: {
      pt: "Pensamento Crítico",
      en: "Critical Thinking",
      es: "Pensamiento Crítico",
    },
    description: {
      pt: "Lógica, falácias e ferramentas para raciocinar melhor",
      en: "Logic, fallacies and tools to reason better",
      es: "Lógica, falacias y herramientas para razonar mejor",
    },
    tags: ["logic", "bias", "argumentation"],
  },
];

// ─── PACKS (uploaded to Firebase Storage) ────────────────────────────────────
// Loaded directly from the bundled assets to avoid maintaining two copies.

const ASSETS_PACKS_DIR = path.join(__dirname, "../mobile/assets/packs");

const PACK_FILES = [
  { id: "critical_thinking", version: 1, langs: ["pt", "en", "es"] },
  { id: "foundations",       version: 1, langs: ["pt", "en", "es"] },
  { id: "geopolitics",       version: 1, langs: ["pt", "en", "es"] },
  { id: "economics",         version: 1, langs: ["pt", "en", "es"] },
];

const PACKS = PACK_FILES.flatMap(({ id, version, langs }) =>
  langs.map((lang) => ({
    storagePath: `packs/${id}/v${version}/${lang}.json`,
    data: require(path.join(ASSETS_PACKS_DIR, `${id}_v${version}_${lang}.json`)),
  }))
);

// ─── LESSONS ──────────────────────────────────────────────────────────────────

const LESSONS = [
  // foundations track
  {
    id: "foundations",
    trackId: "foundations",
    version: 1,
    order: 1,
    title: { pt: "Pensamento Sistêmico", en: "Systems Thinking", es: "Pensamiento Sistémico" },
    estimatedMinutes: 7,
    difficulty: 1,
  },
  {
    id: "foundations_mental_models",
    trackId: "foundations",
    version: 1,
    order: 2,
    title: { pt: "Modelos Mentais", en: "Mental Models", es: "Modelos Mentales" },
    estimatedMinutes: 8,
    difficulty: 1,
  },
  {
    id: "foundations_first_principles",
    trackId: "foundations",
    version: 1,
    order: 3,
    title: { pt: "Primeiros Princípios", en: "First Principles", es: "Primeros Principios" },
    estimatedMinutes: 8,
    difficulty: 2,
  },
  // geopolitics track
  {
    id: "geopolitics",
    trackId: "geopolitics",
    version: 1,
    order: 1,
    title: { pt: "Esfera de Influência", en: "Sphere of Influence", es: "Esfera de Influencia" },
    estimatedMinutes: 8,
    difficulty: 2,
  },
  {
    id: "geopolitics_nato",
    trackId: "geopolitics",
    version: 1,
    order: 2,
    title: { pt: "A OTAN e o Atlântico", en: "NATO and the Atlantic", es: "La OTAN y el Atlántico" },
    estimatedMinutes: 9,
    difficulty: 2,
  },
  {
    id: "geopolitics_brics",
    trackId: "geopolitics",
    version: 1,
    order: 3,
    title: { pt: "BRICS e o Sul Global", en: "BRICS and the Global South", es: "BRICS y el Sur Global" },
    estimatedMinutes: 9,
    difficulty: 2,
  },
  // economics track
  {
    id: "economics",
    trackId: "economics",
    version: 1,
    order: 1,
    title: { pt: "O que é o PIB?", en: "What is GDP?", es: "¿Qué es el PIB?" },
    estimatedMinutes: 7,
    difficulty: 2,
  },
  {
    id: "economics_inflation",
    trackId: "economics",
    version: 1,
    order: 2,
    title: { pt: "Inflação e Poder de Compra", en: "Inflation and Purchasing Power", es: "Inflación y Poder Adquisitivo" },
    estimatedMinutes: 8,
    difficulty: 2,
  },
  {
    id: "economics_interest_rates",
    trackId: "economics",
    version: 1,
    order: 3,
    title: { pt: "Juros e Bancos Centrais", en: "Interest Rates and Central Banks", es: "Tasas de Interés y Bancos Centrales" },
    estimatedMinutes: 9,
    difficulty: 3,
  },
  // critical_thinking track
  {
    id: "critical_thinking",
    trackId: "critical_thinking",
    version: 1,
    order: 1,
    title: { pt: "O Equilíbrio de Poder", en: "The Balance of Power", es: "El Equilibrio de Poder" },
    estimatedMinutes: 8,
    difficulty: 2,
  },
  {
    id: "critical_thinking_fallacies",
    trackId: "critical_thinking",
    version: 1,
    order: 2,
    title: { pt: "Falácias Lógicas", en: "Logical Fallacies", es: "Falacias Lógicas" },
    estimatedMinutes: 9,
    difficulty: 2,
  },
  {
    id: "critical_thinking_bias",
    trackId: "critical_thinking",
    version: 1,
    order: 3,
    title: { pt: "Vieses Cognitivos", en: "Cognitive Biases", es: "Sesgos Cognitivos" },
    estimatedMinutes: 10,
    difficulty: 3,
  },
];

// ─── SEED FUNCTIONS ───────────────────────────────────────────────────────────

async function seedGoals() {
  console.log("📌 Seeding goals...");
  for (const goal of GOALS) {
    await db.collection("goals").doc(goal.id).set(goal);
    console.log(`  ✓ goals/${goal.id}`);
  }
}

async function seedTracks() {
  console.log("🛤️  Seeding tracks...");
  for (const track of TRACKS) {
    await db.collection("tracks").doc(track.id).set(track);
    console.log(`  ✓ tracks/${track.id}`);
  }
}

async function seedLessons() {
  console.log("📖 Seeding lessons...");
  for (const lesson of LESSONS) {
    await db.collection("lessons").doc(lesson.id).set(lesson);
    console.log(`  ✓ lessons/${lesson.id}`);
  }
}

async function seedPacks() {
  console.log("📦 Uploading packs to Storage...");
  for (const pack of PACKS) {
    const file = bucket.file(pack.storagePath);
    await file.save(JSON.stringify(pack.data), {
      contentType: "application/json",
      metadata: { cacheControl: "public, max-age=86400" },
    });
    console.log(`  ✓ ${pack.storagePath}`);
  }
}

async function main() {
  console.log("🌱 Starting Lumen seed...\n");
  try {
    await seedGoals();
    await seedTracks();
    await seedLessons();
    await seedPacks();
    console.log("\n✅ Seed concluído!");
  } catch (err) {
    console.error("\n❌ Erro:", err.message);
    process.exit(1);
  }
}

main();
