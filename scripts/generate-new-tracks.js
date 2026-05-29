/**
 * generate-new-tracks.js
 * Creates 2 new tracks (cosmos + health) with 10 free lessons each.
 * Creates track documents in Firestore + uploads pack JSONs to Storage.
 *
 * Usage:
 *   ANTHROPIC_API_KEY=sk-ant-... node scripts/generate-new-tracks.js
 *   ANTHROPIC_API_KEY=sk-ant-... node scripts/generate-new-tracks.js --track cosmos
 *   ANTHROPIC_API_KEY=sk-ant-... node scripts/generate-new-tracks.js --id cosmos_what_is_life
 *   ANTHROPIC_API_KEY=sk-ant-... node scripts/generate-new-tracks.js --dry-run
 */

const admin = require("firebase-admin");
const Anthropic = require("@anthropic-ai/sdk");
const path = require("path");

const serviceAccount = require(path.join(__dirname, "serviceAccountKey.json"));

admin.initializeApp({
  credential: admin.credential.cert(serviceAccount),
  storageBucket: "lumen-13d0d.firebasestorage.app",
});

const db = admin.firestore();
const bucket = admin.storage().bucket();
const anthropic = new Anthropic.default({ apiKey: process.env.ANTHROPIC_API_KEY });

const CONCURRENCY = 3;
const MODEL_GEN = "claude-sonnet-4-6";
const MODEL_TRANS = "claude-haiku-4-5-20251001";

const args = process.argv.slice(2);
const trackFilter = args.includes("--track") ? args[args.indexOf("--track") + 1] : null;
const idFilter = args.includes("--id") ? args[args.indexOf("--id") + 1] : null;
const dryRun = args.includes("--dry-run");

// ─── TRACK DEFINITIONS ───────────────────────────────────────────────────────

const TRACKS = [
  {
    id: "cosmos",
    order: 11,
    difficulty: 2,
    title: {
      pt: "Cosmos",
      en: "Cosmos",
      es: "Cosmos",
    },
    description: {
      pt: "A maior questão da humanidade: estamos sozinhos? Da origem da vida na Terra à busca por sinais em outros mundos — o que a ciência sabe, o que suspeita e o que ainda não consegue explicar.",
      en: "Humanity's greatest question: are we alone? From the origin of life on Earth to the search for signals in other worlds — what science knows, suspects, and still cannot explain.",
      es: "La mayor pregunta de la humanidad: ¿estamos solos? Desde el origen de la vida en la Tierra hasta la búsqueda de señales en otros mundos — lo que la ciencia sabe, sospecha y todavía no puede explicar.",
    },
    tags: ["cosmos", "astrobiology", "universe", "life", "space"],
  },
  {
    id: "health",
    order: 12,
    difficulty: 2,
    title: {
      pt: "Saúde & Ciência do Corpo",
      en: "Health & Body Science",
      es: "Salud & Ciencia del Cuerpo",
    },
    description: {
      pt: "O conhecimento que pode salvar vidas — sem mitos, sem sensacionalismo. Como o corpo humano funciona, o que a ciência realmente prova sobre doenças, prevenção e bem-estar.",
      en: "Knowledge that can save lives — without myths, without sensationalism. How the human body works, and what science actually proves about disease, prevention, and wellbeing.",
      es: "El conocimiento que puede salvar vidas — sin mitos, sin sensacionalismo. Cómo funciona el cuerpo humano y lo que la ciencia realmente demuestra sobre enfermedades, prevención y bienestar.",
    },
    tags: ["health", "medicine", "body", "science", "prevention"],
  },
];

// ─── LESSON DEFINITIONS ───────────────────────────────────────────────────────

const LESSONS = [
  // ── cosmos ──────────────────────────────────────────────────────────────────
  {
    id: "cosmos",
    trackId: "cosmos",
    order: 1,
    difficulty: 1,
    title: { pt: "O Universo em Perspectiva", en: "The Universe in Perspective", es: "El Universo en Perspectiva" },
    topic: "A escala do universo: distâncias astronômicas, o que é um ano-luz, quantas estrelas existem, quantas galáxias, o tamanho da Via Láctea, onde fica a Terra nesse contexto, por que isso importa para a questão da vida — introdução ao curso com impacto emocional e intelectual",
  },
  {
    id: "cosmos_what_is_life",
    trackId: "cosmos",
    order: 2,
    difficulty: 2,
    title: { pt: "O que é Vida?", en: "What Is Life?", es: "¿Qué es la Vida?" },
    topic: "A definição científica de vida: as 7 características dos seres vivos, por que definir vida é mais difícil do que parece, vírus são vivos?, extremófilos e os limites da vida na Terra (bactérias em vulcões, gelo, ácido, vácuo), o que esses casos extremos nos dizem sobre possibilidade de vida em outros planetas",
  },
  {
    id: "cosmos_origin_of_life",
    trackId: "cosmos",
    order: 3,
    difficulty: 3,
    title: { pt: "Como a Vida Surgiu na Terra?", en: "How Did Life Arise on Earth?", es: "¿Cómo Surgió la Vida en la Tierra?" },
    topic: "As teorias sobre a origem da vida: abiogênese, experimento Miller-Urey, a hipótese do mundo RNA, hidrotermais oceânicas como berço da vida, panspermia (a ideia de que a vida veio do espaço), por que ainda não sabemos a resposta com certeza, o que estamos descobrindo",
  },
  {
    id: "cosmos_habitable_zone",
    trackId: "cosmos",
    order: 4,
    difficulty: 2,
    title: { pt: "Zona Habitável: Onde a Vida é Possível", en: "Habitable Zone: Where Life Is Possible", es: "Zona Habitable: Dónde es Posible la Vida" },
    topic: "O conceito de zona habitável: por que água líquida é essencial, a distância certa da estrela, por que Vênus ficou quente demais e Marte frio demais, a zona habitável não é absoluta (Europa tem oceano subterrâneo fora da zona habitável clássica), limites e nuances do conceito",
  },
  {
    id: "cosmos_solar_system_life",
    trackId: "cosmos",
    order: 5,
    difficulty: 2,
    title: { pt: "Onde Pode Haver Vida no Sistema Solar?", en: "Where Might Life Exist in the Solar System?", es: "¿Dónde Podría Haber Vida en el Sistema Solar?" },
    topic: "Os candidatos mais promissores: Marte (água no passado, perclorato, missões Perseverance e Curiosity), Europa (oceano subterrâneo com mais água que a Terra, missão Europa Clipper), Enceladus (gêiseres de água e moléculas orgânicas), Titã (química orgânica complexa), o que cada um representaria se tivesse vida",
  },
  {
    id: "cosmos_exoplanets",
    trackId: "cosmos",
    order: 6,
    difficulty: 2,
    title: { pt: "Exoplanetas: Mundos Além do Sol", en: "Exoplanets: Worlds Beyond the Sun", es: "Exoplanetas: Mundos Más Allá del Sol" },
    topic: "Como descobrimos exoplanetas: método do trânsito (Kepler/JWST), velocidade radial, imagem direta, o que esses métodos nos dizem sobre a composição, temperatura e potencial dos planetas, os casos mais fascinantes (Proxima Centauri b, TRAPPIST-1), quantos exoplanetas já foram encontrados",
  },
  {
    id: "cosmos_drake_equation",
    trackId: "cosmos",
    order: 7,
    difficulty: 2,
    title: { pt: "A Equação de Drake", en: "The Drake Equation", es: "La Ecuación de Drake" },
    topic: "A equação de Drake: o que é, como funciona, cada fator (taxa de formação de estrelas, fração com planetas, planetas habitáveis, onde surge vida, onde há inteligência, onde há tecnologia, duração de civilizações), os valores otimistas vs. pessimistas, o que a equação nos diz sobre nossas chances de não estar sozinhos",
  },
  {
    id: "cosmos_seti",
    trackId: "cosmos",
    order: 8,
    difficulty: 2,
    title: { pt: "SETI: A Busca por Inteligência Extraterrestre", en: "SETI: The Search for Extraterrestrial Intelligence", es: "SETI: La Búsqueda de Inteligencia Extraterrestre" },
    topic: "O projeto SETI: história, como funciona (radiotelescópios, frequências, WOW! signal de 1977), o que procuramos (biosignaturas, tecnossignaturas, megaestruturas como a estrela de Tabby), METI (mandar mensagens), o debate sobre se deveríamos nos anunciar, a missão Breakthrough Listen",
  },
  {
    id: "cosmos_fermi_paradox",
    trackId: "cosmos",
    order: 9,
    difficulty: 3,
    title: { pt: "O Paradoxo de Fermi", en: "The Fermi Paradox", es: "La Paradoja de Fermi" },
    topic: "O Paradoxo de Fermi: se o universo é tão vasto e antigo, onde estão todos? As principais hipóteses: Grande Filtro (estamos antes ou depois dele?), hipótese do zoológico, hipótese da terra rara, civilizações silenciosas, simulação, a hipótese sombria (vida inteligente se autodestrói), o que cada resposta implicaria para a humanidade",
  },
  {
    id: "cosmos_impact",
    trackId: "cosmos",
    order: 10,
    difficulty: 2,
    title: { pt: "E se Descobríssemos Vida?", en: "What If We Discovered Life?", es: "¿Y si Descubriéramos Vida?" },
    topic: "O que a descoberta de vida extraterrestre significaria: impacto filosófico e religioso, impacto científico (a vida é um princípio universal?), como diferentes religiões encarariam isso, o protocolo internacional caso detecção seja confirmada, o impacto psicológico e cultural, por que muitos cientistas acreditam que a descoberta é iminente nas próximas décadas",
  },

  // ── health ───────────────────────────────────────────────────────────────────
  {
    id: "health",
    trackId: "health",
    order: 1,
    difficulty: 1,
    title: { pt: "Como o Corpo Humano Funciona", en: "How the Human Body Works", es: "Cómo Funciona el Cuerpo Humano" },
    topic: "Introdução à fisiologia humana: os principais sistemas do corpo (cardiovascular, respiratório, digestivo, nervoso, imunológico, endócrino), como se comunicam, homeostase — o princípio que mantém tudo em equilíbrio, por que entender o corpo é fundamental para tomar decisões de saúde melhores",
  },
  {
    id: "health_sleep",
    trackId: "health",
    order: 2,
    difficulty: 2,
    title: { pt: "A Ciência do Sono", en: "The Science of Sleep", es: "La Ciencia del Sueño" },
    topic: "Como o sono funciona: ciclos REM e não-REM, o que acontece no cérebro durante o sono (consolidação de memória, limpeza de resíduos metabólicos pelo sistema glinfático), o que a privação de sono faz ao corpo e à mente (imunidade, cognição, humor, risco de doenças), quanto sono precisamos, mitos do sono, as consequências de uma sociedade cronicamente privada de sono",
  },
  {
    id: "health_heart_stroke",
    trackId: "health",
    order: 3,
    difficulty: 2,
    title: { pt: "Infarto e AVC: Reconhecer Pode Salvar Vidas", en: "Heart Attack and Stroke: Recognition Can Save Lives", es: "Infarto y ACV: Reconocer Puede Salvar Vidas" },
    topic: "O que é infarto e o que é AVC, como cada um acontece fisiologicamente, os sinais de alerta (FAST para AVC, sintomas de infarto em homens e mulheres — são diferentes), por que as pessoas ignoram os sinais, o fator tempo (janela terapêutica), o que fazer enquanto espera socorro, fatores de risco modificáveis, prevenção",
  },
  {
    id: "health_blood_tests",
    trackId: "health",
    order: 4,
    difficulty: 2,
    title: { pt: "O que Seus Exames de Sangue Dizem", en: "What Your Blood Tests Say", es: "Lo que Dicen Tus Análisis de Sangre" },
    topic: "Como ler um hemograma e exames básicos: glicose e diabetes, colesterol LDL/HDL/triglicerídeos (o que realmente importa), TSH e tireoide, hemograma completo, PCR e inflamação, creatinina e função renal, o que os valores de referência significam, quando se preocupar e quando não se preocupar, como conversar com médico com mais informação",
  },
  {
    id: "health_hypertension",
    trackId: "health",
    order: 5,
    difficulty: 2,
    title: { pt: "Hipertensão: O Assassino Silencioso", en: "Hypertension: The Silent Killer", es: "Hipertensión: El Asesino Silencioso" },
    topic: "O que é hipertensão, por que é chamada de assassino silencioso (sem sintomas até o dano estar feito), como medir corretamente a pressão, os danos ao coração, rins e cérebro, fatores de risco (sal, estresse, obesidade, sedentarismo, genética), o que a ciência prova que funciona na prevenção e tratamento, por que tantas pessoas param o remédio",
  },
  {
    id: "health_immune_system",
    trackId: "health",
    order: 6,
    difficulty: 2,
    title: { pt: "Como Funciona o Sistema Imunológico", en: "How the Immune System Works", es: "Cómo Funciona el Sistema Inmunológico" },
    topic: "Imunidade inata vs. adaptativa, como o corpo reconhece invasores, o papel dos linfócitos B e T, como as vacinas funcionam (e por que funcionam), inflamação como resposta protetora e como fica prejudicial, doenças autoimunes (o sistema atacando o próprio corpo), como fortalecer o sistema imune (o que a ciência realmente prova, sem mitos)",
  },
  {
    id: "health_cancer",
    trackId: "health",
    order: 7,
    difficulty: 3,
    title: { pt: "Câncer: O que a Ciência Realmente Sabe", en: "Cancer: What Science Really Knows", es: "Cáncer: Lo que la Ciencia Realmente Sabe" },
    topic: "O que é câncer (mutação e divisão celular descontrolada), os fatores de risco comprovados vs. os mitos, os cânceres mais comuns no Brasil e no mundo, triagem e diagnóstico precoce (por que importa tanto), como funciona o tratamento moderno (quimio, radioterapia, imunoterapia, terapia-alvo), o papel da prevenção, o que fazer e o que não fazer",
  },
  {
    id: "health_mental_health",
    trackId: "health",
    order: 8,
    difficulty: 2,
    title: { pt: "Saúde Mental: Estresse, Ansiedade e Depressão", en: "Mental Health: Stress, Anxiety and Depression", es: "Salud Mental: Estrés, Ansiedad y Depresión" },
    topic: "A diferença entre estresse normal, ansiedade clínica e depressão, como o cérebro responde ao estresse (cortisol, amígdala, eixo HPA), quando buscar ajuda, o estigma e por que ainda existe, o que funciona no tratamento (psicoterapia, medicação, exercício), como apoiar alguém próximo com transtorno mental, a epidemia global de saúde mental",
  },
  {
    id: "health_nutrition",
    trackId: "health",
    order: 9,
    difficulty: 2,
    title: { pt: "Nutrição Sem Mitos", en: "Nutrition Without Myths", es: "Nutrición Sin Mitos" },
    topic: "O que a ciência da nutrição realmente sabe (e suas limitações): macronutrientes, por que estudos nutricionais são difíceis de fazer, o que tem consenso forte (ultraprocessados fazem mal, fibras são boas, variedade importa), dietas populares analisadas (low carb, jejum intermitente, vegana), como ler estudos de nutrição com ceticismo, o microbioma intestinal",
  },
  {
    id: "health_exercise",
    trackId: "health",
    order: 10,
    difficulty: 1,
    title: { pt: "Exercício: O Remédio Mais Poderoso", en: "Exercise: The Most Powerful Medicine", es: "Ejercicio: El Medicamento Más Poderoso" },
    topic: "O que a ciência prova sobre exercício: benefícios cardiovasculares, cognitivos, metabólicos e de saúde mental, quanto exercício é necessário (recomendações da OMS), aeróbico vs. resistência, por que sedentarismo é o novo tabagismo, como criar o hábito de exercitar (o que a ciência comportamental diz), exercício na terceira idade, o mito do 'sem dor sem ganho'",
  },
];

// ─── PROMPTS ─────────────────────────────────────────────────────────────────

function buildLessonPrompt(lesson) {
  return `You are writing educational content for Lumen, a mobile learning app. The tone is clear, direct, and intellectually engaging — like a brilliant friend explaining something important, not a textbook.

Track: "${lesson.trackId === "cosmos" ? "Vida no Universo (Life in the Universe)" : "Saúde & Ciência do Corpo (Health & Body Science)"}"
Lesson title: "${lesson.title.pt}"
Topic to cover: ${lesson.topic}

Write a detailed lesson in Brazilian Portuguese.

Return ONLY a valid JSON object:
{
  "summary": "<one compelling sentence summarizing the lesson, max 20 words>",
  "blocks": [ ... ]
}

Block types:
{ "type": "h2", "text": "<section header — short and descriptive>" }
{ "type": "p", "text": "<paragraph>" }
{ "type": "quote", "text": "<quote — Real Author or Source>" }
{ "type": "bullets", "items": ["<item>", "<item>", "<item>"] }

Rules:
- Total blocks: 11 to 14
- At least 4 h2 section headers
- At least 5 paragraphs — 2 to 4 sentences each, dense and informative, zero filler
- At least 2 bullet lists with 3 to 5 items each
- Exactly 1 quote from a real scientist, thinker, or credible source (attributed)
- Narrative structure:
  1. Hook — why this matters / a surprising fact to grab attention
  2. Core concept — define and explain clearly
  3. How it works — mechanisms, evidence, specifics
  4. Real-world examples — specific cases, data, studies
  5. Nuance / limitations / what we don't know yet
  6. What to take away / how to apply this knowledge
- Use specific names, data, studies, and cases — no vague generalities
- For health track: evidence-based only, no pseudoscience, cite real research when possible
- For cosmos track: scientifically accurate, convey wonder without sacrificing rigor
- Language: Brazilian Portuguese
- Return ONLY the JSON object, no markdown`;
}

function buildLessonTranslatePrompt(lesson, summaryPt, blocksPt) {
  return `Translate this lesson from Brazilian Portuguese to English and Spanish.

EN title: "${lesson.title.en}"
ES title: "${lesson.title.es}"

Rules:
- Natural, idiomatic translation — NOT word-for-word
- Preserve exact JSON structure and all field names (type, text, items)
- Translate ALL text values including bullet items and quotes
- Keep block order and types identical

Input summary (PT): "${summaryPt}"
Input blocks (PT):
${JSON.stringify(blocksPt, null, 2)}

Return ONLY a valid JSON object, no markdown:
{
  "en": { "summary": "<translated summary>", "blocks": [ ... ] },
  "es": { "summary": "<translated summary>", "blocks": [ ... ] }
}`;
}

function buildQuizPrompt(lesson, summaryPt, blocksPt) {
  const lessonText = blocksPt
    .map((b) => (b.type === "bullets" ? b.items.join(". ") : b.text))
    .filter(Boolean)
    .join("\n");

  return `Create exactly 5 multiple-choice quiz questions in Brazilian Portuguese based on this lesson.

Lesson: "${lesson.title.pt}"
Content:
${lessonText}

Question distribution (in this exact order):
1. Definition — test recall of a key concept from the lesson
2. Definition — test another important concept
3. Application — test understanding in a real-world context
4. Application — another scenario or situation
5. Example — recognize a specific example or case

Rules:
- Exactly 4 options per question
- Vary the correct answer position: use different answerIndex values (0, 1, 2, 3) across questions — do NOT use the same index for all 5
- Each explanation adds genuine insight beyond just restating the answer (1-2 sentences)
- Questions test UNDERSTANDING, not just memorization
- All text in Brazilian Portuguese

Return ONLY a valid JSON array, no markdown:
[
  { "id": "q1", "question": "...", "options": ["...", "...", "...", "..."], "answerIndex": 0, "explanation": "..." },
  { "id": "q2", ... },
  { "id": "q3", ... },
  { "id": "q4", ... },
  { "id": "q5", ... }
]`;
}

function buildQuizTranslatePrompt(quizPt) {
  return `Translate this quiz from Brazilian Portuguese to English and Spanish.

Rules:
- Preserve exact JSON structure and all field names
- Keep all answerIndex values unchanged
- Natural, idiomatic translation of question, options, and explanation
- Do NOT change the number of questions or options

Input (PT):
${JSON.stringify(quizPt, null, 2)}

Return ONLY a valid JSON object, no markdown:
{
  "en": [ /* 5 questions translated to English */ ],
  "es": [ /* 5 questions translated to Spanish */ ]
}`;
}

// ─── FIREBASE HELPERS ─────────────────────────────────────────────────────────

async function packExists(id) {
  const file = bucket.file(`packs/${id}/v1/pt.json`);
  const [exists] = await file.exists();
  return exists;
}

async function uploadLang(id, lang, packData) {
  await bucket.file(`packs/${id}/v1/${lang}.json`).save(
    JSON.stringify(packData, null, 2),
    { contentType: "application/json", metadata: { cacheControl: "public, max-age=0" } }
  );
}

async function createTrack(track) {
  await db.collection("tracks").doc(track.id).set(track);
}

async function registerLesson(lesson) {
  await db.collection("lessons").doc(lesson.id).set({
    id: lesson.id,
    trackId: lesson.trackId,
    version: 1,
    order: lesson.order,
    title: lesson.title,
    estimatedMinutes: 11,
    difficulty: lesson.difficulty,
    tier: "free",
    prerequisites: [],
    coverImageUrl: null,
    coverImageCredit: null,
  });
}

// ─── CORE GENERATOR ──────────────────────────────────────────────────────────

async function generateLesson(lesson) {
  // Step 1: Generate lesson blocks in PT
  const lessonRes = await anthropic.messages.create({
    model: MODEL_GEN,
    max_tokens: 3000,
    messages: [{ role: "user", content: buildLessonPrompt(lesson) }],
  });

  const lessonPt = JSON.parse(lessonRes.content[0].text.trim());
  const { summary: summaryPt, blocks: blocksPt } = lessonPt;

  if (!Array.isArray(blocksPt) || blocksPt.length < 8) {
    throw new Error(`PT lesson too short: ${blocksPt?.length} blocks`);
  }

  // Step 2: Translate lesson to EN + ES
  const transRes = await anthropic.messages.create({
    model: MODEL_TRANS,
    max_tokens: 5000,
    messages: [{ role: "user", content: buildLessonTranslatePrompt(lesson, summaryPt, blocksPt) }],
  });

  const translations = JSON.parse(transRes.content[0].text.trim());
  const { en: { summary: summaryEn, blocks: blocksEn }, es: { summary: summaryEs, blocks: blocksEs } } = translations;

  if (!Array.isArray(blocksEn) || blocksEn.length < 8) throw new Error(`EN translation too short`);
  if (!Array.isArray(blocksEs) || blocksEs.length < 8) throw new Error(`ES translation too short`);

  // Step 3: Generate quiz in PT
  const quizRes = await anthropic.messages.create({
    model: MODEL_GEN,
    max_tokens: 2000,
    messages: [{ role: "user", content: buildQuizPrompt(lesson, summaryPt, blocksPt) }],
  });

  const quizPt = JSON.parse(quizRes.content[0].text.trim());
  if (!Array.isArray(quizPt) || quizPt.length !== 5) {
    throw new Error(`Expected 5 PT quiz questions, got ${quizPt?.length}`);
  }
  quizPt.forEach((q, i) => { q.id = `q${i + 1}`; });

  // Step 4: Translate quiz to EN + ES
  const quizTransRes = await anthropic.messages.create({
    model: MODEL_TRANS,
    max_tokens: 3000,
    messages: [{ role: "user", content: buildQuizTranslatePrompt(quizPt) }],
  });

  const quizTrans = JSON.parse(quizTransRes.content[0].text.trim());
  const quizEn = quizTrans.en;
  const quizEs = quizTrans.es;

  if (!Array.isArray(quizEn) || quizEn.length !== 5) throw new Error(`EN quiz wrong length`);
  if (!Array.isArray(quizEs) || quizEs.length !== 5) throw new Error(`ES quiz wrong length`);
  quizEn.forEach((q, i) => { q.id = `q${i + 1}`; });
  quizEs.forEach((q, i) => { q.id = `q${i + 1}`; });

  if (dryRun) {
    console.log(`  [DRY RUN] ${lesson.id}: ${blocksPt.length} blocks, ${quizPt.length} questions`);
    return;
  }

  // Step 5: Upload to Firebase Storage
  const makePackJson = (title, summary, blocks, quiz) => ({
    id: lesson.id,
    version: 1,
    lesson: { title, summary, audioUrl: null, blocks },
    cards: [],
    quiz,
  });

  await Promise.all([
    uploadLang(lesson.id, "pt", makePackJson(lesson.title.pt, summaryPt, blocksPt, quizPt)),
    uploadLang(lesson.id, "en", makePackJson(lesson.title.en, summaryEn, blocksEn, quizEn)),
    uploadLang(lesson.id, "es", makePackJson(lesson.title.es, summaryEs, blocksEs, quizEs)),
  ]);

  // Step 6: Register lesson in Firestore
  await registerLesson(lesson);
}

// ─── MAIN ─────────────────────────────────────────────────────────────────────

async function main() {
  if (!process.env.ANTHROPIC_API_KEY) {
    console.error("Missing ANTHROPIC_API_KEY");
    process.exit(1);
  }

  let lessons = LESSONS;
  if (trackFilter) lessons = lessons.filter(l => l.trackId === trackFilter);
  if (idFilter) lessons = lessons.filter(l => l.id === idFilter);

  // Create track documents in Firestore
  const tracksToCreate = trackFilter
    ? TRACKS.filter(t => t.id === trackFilter)
    : TRACKS;

  if (!dryRun) {
    for (const track of tracksToCreate) {
      await createTrack(track);
      console.log(`✓ tracks/${track.id} created`);
    }
  }

  // Skip lessons already uploaded (allows resuming)
  const toGenerate = [];
  for (const lesson of lessons) {
    if (!dryRun && await packExists(lesson.id)) {
      console.log(`  skip ${lesson.id} (already exists)`);
    } else {
      toGenerate.push(lesson);
    }
  }

  console.log(`\nGenerating ${toGenerate.length} lessons (model: ${MODEL_GEN}, concurrency: ${CONCURRENCY})${dryRun ? " [DRY RUN]" : ""}...\n`);

  let ok = 0, failed = 0;
  const errors = [];

  for (let i = 0; i < toGenerate.length; i += CONCURRENCY) {
    const batch = toGenerate.slice(i, i + CONCURRENCY);
    await Promise.all(batch.map(async (lesson) => {
      process.stdout.write(`  [${lesson.trackId}] ${lesson.id} (order ${lesson.order})... `);
      try {
        await generateLesson(lesson);
        console.log(`✓`);
        ok++;
      } catch (err) {
        console.log(`✗ ${err.message}`);
        errors.push({ id: lesson.id, error: err.message });
        failed++;
      }
    }));
  }

  console.log(`\nDone. ${ok} generated, ${failed} failed.`);
  if (errors.length > 0) {
    console.log("\nFailed lessons:");
    errors.forEach(e => console.log(`  ${e.id}: ${e.error}`));
    console.log("\nTo retry failed: node generate-new-tracks.js --id <id>");
  }
  process.exit(0);
}

main().catch(err => { console.error(err); process.exit(1); });
