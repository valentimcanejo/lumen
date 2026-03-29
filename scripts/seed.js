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
  {
    id: "history",
    order: 5,
    difficulty: 2,
    title: {
      pt: "História",
      en: "History",
      es: "Historia",
    },
    description: {
      pt: "Os eventos que moldaram o mundo em que vivemos",
      en: "The events that shaped the world we live in",
      es: "Los eventos que moldearon el mundo en que vivimos",
    },
    tags: ["history", "events", "civilization"],
  },
  {
    id: "psychology",
    order: 6,
    difficulty: 2,
    title: {
      pt: "Psicologia",
      en: "Psychology",
      es: "Psicología",
    },
    description: {
      pt: "Como a mente humana pensa, sente e se comporta",
      en: "How the human mind thinks, feels and behaves",
      es: "Cómo la mente humana piensa, siente y se comporta",
    },
    tags: ["mind", "behavior", "emotions", "habits"],
  },
];

// ─── PACKS (uploaded to Firebase Storage) ────────────────────────────────────
// Loaded directly from the bundled assets to avoid maintaining two copies.
// Files that don't exist locally are skipped (already on Storage).

const ASSETS_PACKS_DIR = path.join(__dirname, "../mobile/assets/packs");

const PACK_FILES = [
  { id: "critical_thinking",           version: 1, langs: ["pt", "en", "es"] },
  { id: "critical_thinking_fallacies", version: 1, langs: ["pt", "en", "es"] },
  { id: "critical_thinking_bias",      version: 1, langs: ["pt", "en", "es"] },
  { id: "foundations",                 version: 1, langs: ["pt", "en", "es"] },
  { id: "foundations_mental_models",   version: 1, langs: ["pt", "en", "es"] },
  { id: "foundations_first_principles", version: 1, langs: ["pt", "en", "es"] },
  { id: "geopolitics",                 version: 1, langs: ["pt", "en", "es"] },
  { id: "geopolitics_nato",            version: 1, langs: ["pt", "en", "es"] },
  { id: "geopolitics_brics",           version: 1, langs: ["pt", "en", "es"] },
  { id: "economics",                   version: 1, langs: ["pt", "en", "es"] },
  { id: "economics_inflation",         version: 1, langs: ["pt", "en", "es"] },
  { id: "economics_interest_rates",    version: 1, langs: ["pt", "en", "es"] },
];

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
    prerequisites: ["foundations_mental_models"],
  },
  {
    id: "foundations_decision_making",
    trackId: "foundations",
    version: 1,
    order: 4,
    title: { pt: "Tomada de Decisão sob Incerteza", en: "Decision Making Under Uncertainty", es: "Toma de Decisiones bajo Incertidumbre" },
    estimatedMinutes: 8,
    difficulty: 2,
    prerequisites: ["foundations_first_principles"],
  },
  {
    id: "foundations_probabilistic",
    trackId: "foundations",
    version: 1,
    order: 5,
    title: { pt: "Pensamento Probabilístico", en: "Probabilistic Thinking", es: "Pensamiento Probabilístico" },
    estimatedMinutes: 8,
    difficulty: 2,
    prerequisites: ["foundations_decision_making"],
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
    prerequisites: ["geopolitics"],
  },
  {
    id: "geopolitics_middle_east",
    trackId: "geopolitics",
    version: 1,
    order: 4,
    title: { pt: "O Oriente Médio em Disputa", en: "The Contested Middle East", es: "El Oriente Medio en Disputa" },
    estimatedMinutes: 10,
    difficulty: 3,
    prerequisites: ["geopolitics_nato", "geopolitics_brics"],
  },
  {
    id: "geopolitics_china_usa",
    trackId: "geopolitics",
    version: 1,
    order: 5,
    title: { pt: "China vs EUA: A Nova Guerra Fria", en: "China vs USA: The New Cold War", es: "China vs EE.UU.: La Nueva Guerra Fría" },
    estimatedMinutes: 10,
    difficulty: 3,
    prerequisites: ["geopolitics_nato", "geopolitics_brics"],
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
    prerequisites: ["economics_inflation"],
  },
  {
    id: "economics_fiscal_policy",
    trackId: "economics",
    version: 1,
    order: 4,
    title: { pt: "Política Fiscal: O Governo e o Dinheiro", en: "Fiscal Policy: Government and Money", es: "Política Fiscal: El Gobierno y el Dinero" },
    estimatedMinutes: 9,
    difficulty: 2,
    prerequisites: ["economics_inflation"],
  },
  {
    id: "economics_trade",
    trackId: "economics",
    version: 1,
    order: 5,
    title: { pt: "Comércio Internacional", en: "International Trade", es: "Comercio Internacional" },
    estimatedMinutes: 9,
    difficulty: 2,
    prerequisites: ["economics_fiscal_policy"],
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
    prerequisites: ["critical_thinking_fallacies"],
  },
  {
    id: "critical_thinking_scientific",
    trackId: "critical_thinking",
    version: 1,
    order: 4,
    title: { pt: "Método Científico", en: "Scientific Method", es: "Método Científico" },
    estimatedMinutes: 9,
    difficulty: 2,
    prerequisites: ["critical_thinking_bias"],
  },
  {
    id: "critical_thinking_rhetoric",
    trackId: "critical_thinking",
    version: 1,
    order: 5,
    title: { pt: "Retórica e Persuasão", en: "Rhetoric and Persuasion", es: "Retórica y Persuasión" },
    estimatedMinutes: 9,
    difficulty: 3,
    prerequisites: ["critical_thinking_scientific"],
  },
  // history track
  {
    id: "history",
    trackId: "history",
    version: 1,
    order: 1,
    title: { pt: "O que a História Ensina", en: "What History Teaches", es: "Lo que la Historia Enseña" },
    estimatedMinutes: 7,
    difficulty: 1,
    prerequisites: [],
  },
  {
    id: "history_wwii",
    trackId: "history",
    version: 1,
    order: 2,
    title: { pt: "Segunda Guerra Mundial", en: "World War II", es: "Segunda Guerra Mundial" },
    estimatedMinutes: 10,
    difficulty: 2,
    prerequisites: ["history"],
  },
  {
    id: "history_cold_war",
    trackId: "history",
    version: 1,
    order: 3,
    title: { pt: "A Guerra Fria", en: "The Cold War", es: "La Guerra Fría" },
    estimatedMinutes: 9,
    difficulty: 2,
    prerequisites: ["history"],
  },
  {
    id: "history_colonialism",
    trackId: "history",
    version: 1,
    order: 4,
    title: { pt: "Colonialismo e Descolonização", en: "Colonialism and Decolonization", es: "Colonialismo y Descolonización" },
    estimatedMinutes: 10,
    difficulty: 3,
    prerequisites: ["history_wwii", "history_cold_war"],
  },
  {
    id: "history_industrial_revolution",
    trackId: "history",
    version: 1,
    order: 5,
    title: { pt: "A Revolução Industrial", en: "The Industrial Revolution", es: "La Revolución Industrial" },
    estimatedMinutes: 9,
    difficulty: 2,
    prerequisites: ["history_cold_war"],
  },
  // psychology track
  {
    id: "psychology",
    trackId: "psychology",
    version: 1,
    order: 1,
    title: { pt: "Como a Mente Funciona", en: "How the Mind Works", es: "Cómo Funciona la Mente" },
    estimatedMinutes: 7,
    difficulty: 1,
    prerequisites: [],
  },
  {
    id: "psychology_emotions",
    trackId: "psychology",
    version: 1,
    order: 2,
    title: { pt: "Emoções e Decisões", en: "Emotions and Decisions", es: "Emociones y Decisiones" },
    estimatedMinutes: 8,
    difficulty: 2,
    prerequisites: ["psychology"],
  },
  {
    id: "psychology_habits",
    trackId: "psychology",
    version: 1,
    order: 3,
    title: { pt: "A Ciência dos Hábitos", en: "The Science of Habits", es: "La Ciencia de los Hábitos" },
    estimatedMinutes: 9,
    difficulty: 2,
    prerequisites: ["psychology"],
  },
  {
    id: "psychology_social",
    trackId: "psychology",
    version: 1,
    order: 4,
    title: { pt: "Psicologia Social", en: "Social Psychology", es: "Psicología Social" },
    estimatedMinutes: 9,
    difficulty: 2,
    prerequisites: ["psychology_emotions", "psychology_habits"],
  },
  {
    id: "psychology_resilience",
    trackId: "psychology",
    version: 1,
    order: 5,
    title: { pt: "Resiliência Mental", en: "Mental Resilience", es: "Resiliencia Mental" },
    estimatedMinutes: 8,
    difficulty: 2,
    prerequisites: ["psychology_social"],
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
  const packs = PACK_FILES.flatMap(({ id, version, langs }) =>
    langs.flatMap((lang) => {
      const filePath = path.join(ASSETS_PACKS_DIR, `${id}_v${version}_${lang}.json`);
      try {
        return [{ storagePath: `packs/${id}/v${version}/${lang}.json`, data: require(filePath) }];
      } catch {
        return [];
      }
    })
  );
  if (packs.length === 0) {
    console.log("  ⚠ Nenhum arquivo de pack encontrado localmente — pulando upload.");
    return;
  }
  for (const pack of packs) {
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
