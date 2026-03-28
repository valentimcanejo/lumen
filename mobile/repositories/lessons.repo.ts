import { collection, getDocs, query, where, orderBy } from "firebase/firestore";
import { db } from "../firebase/firebaseConfig";
import type { Lang } from "../models/lang";

export type LessonTier = "free" | "premium";
export type LessonStatus = "published" | "draft" | "archived";

export type LessonMeta = {
  id: string;          // contentId — used to load the pack
  trackId: string;
  version: number;
  order: number;
  title: Partial<Record<Lang, string>>;
  estimatedMinutes: number;
  difficulty: 1 | 2 | 3;
  tier: LessonTier;          // content gating
  status: LessonStatus;      // visibility control
  prerequisites: string[];   // contentIds that must be completed first
};

// Bundled fallback so the screen works offline
// Shorthand to keep each entry concise
function L(
  id: string, trackId: string, order: number,
  title: Partial<Record<Lang, string>>,
  estimatedMinutes: number, difficulty: 1 | 2 | 3,
  prerequisites: string[] = [], tier: LessonTier = "free",
): LessonMeta {
  return { id, trackId, version: 1, order, title, estimatedMinutes, difficulty, tier, status: "published", prerequisites };
}

const BUNDLED_LESSONS: LessonMeta[] = [
  // foundations
  L("foundations",               "foundations", 1, { pt: "Pensamento Sistêmico",            en: "Systems Thinking",                  es: "Pensamiento Sistémico"           }, 7,  1, []),
  L("foundations_mental_models", "foundations", 2, { pt: "Modelos Mentais",                 en: "Mental Models",                     es: "Modelos Mentales"                }, 8,  1, ["foundations"]),
  L("foundations_first_principles","foundations",3,{ pt: "Primeiros Princípios",            en: "First Principles",                  es: "Primeros Principios"             }, 8,  2, ["foundations_mental_models"]),
  L("foundations_decision_making","foundations", 4, { pt: "Tomada de Decisão sob Incerteza",en: "Decision Making Under Uncertainty", es: "Toma de Decisiones bajo Incertidumbre"}, 8, 2, ["foundations_first_principles"]),
  // geopolitics
  L("geopolitics",               "geopolitics", 1, { pt: "Esfera de Influência",            en: "Sphere of Influence",               es: "Esfera de Influencia"            }, 8,  2, []),
  L("geopolitics_nato",          "geopolitics", 2, { pt: "A OTAN e o Atlântico",            en: "NATO and the Atlantic",             es: "La OTAN y el Atlántico"          }, 9,  2, ["geopolitics"]),
  L("geopolitics_brics",         "geopolitics", 3, { pt: "BRICS e o Sul Global",            en: "BRICS and the Global South",        es: "BRICS y el Sur Global"           }, 9,  2, ["geopolitics"]),
  L("geopolitics_middle_east",   "geopolitics", 4, { pt: "O Oriente Médio em Disputa",      en: "The Contested Middle East",         es: "El Oriente Medio en Disputa"     }, 10, 3, ["geopolitics_nato", "geopolitics_brics"]),
  L("geopolitics_china_usa",     "geopolitics", 5, { pt: "China vs EUA: A Nova Guerra Fria",en: "China vs USA: The New Cold War",    es: "China vs EE.UU.: La Nueva Guerra Fría"}, 10, 3, ["geopolitics_nato", "geopolitics_brics"]),
  // economics
  L("economics",                 "economics",   1, { pt: "O que é o PIB?",                  en: "What is GDP?",                      es: "¿Qué es el PIB?"                 }, 7,  2, []),
  L("economics_inflation",       "economics",   2, { pt: "Inflação e Poder de Compra",       en: "Inflation and Purchasing Power",    es: "Inflación y Poder Adquisitivo"   }, 8,  2, ["economics"]),
  L("economics_interest_rates",  "economics",   3, { pt: "Juros e Bancos Centrais",          en: "Interest Rates and Central Banks",  es: "Tasas de Interés y Bancos Centrales"}, 9, 3, ["economics_inflation"]),
  L("economics_fiscal_policy",   "economics",   4, { pt: "Política Fiscal: O Governo e o Dinheiro", en: "Fiscal Policy: Government and Money", es: "Política Fiscal: El Gobierno y el Dinero"}, 9, 2, ["economics_inflation"]),
  // critical_thinking
  L("critical_thinking",           "critical_thinking", 1, { pt: "O Equilíbrio de Poder",     en: "The Balance of Power",       es: "El Equilibrio de Poder"       }, 8,  2, []),
  L("critical_thinking_fallacies", "critical_thinking", 2, { pt: "Falácias Lógicas",           en: "Logical Fallacies",          es: "Falacias Lógicas"             }, 9,  2, ["critical_thinking"]),
  L("critical_thinking_bias",      "critical_thinking", 3, { pt: "Vieses Cognitivos",          en: "Cognitive Biases",           es: "Sesgos Cognitivos"            }, 10, 3, ["critical_thinking_fallacies"]),
  L("critical_thinking_scientific","critical_thinking", 4, { pt: "Método Científico",          en: "Scientific Method",          es: "Método Científico"            }, 9,  2, ["critical_thinking_bias"]),
  L("critical_thinking_rhetoric",  "critical_thinking", 5, { pt: "Retórica e Persuasão",       en: "Rhetoric and Persuasion",    es: "Retórica y Persuasión"        }, 9,  3, ["critical_thinking_scientific"]),
  // foundations (lição 5)
  L("foundations_probabilistic",   "foundations",       5, { pt: "Pensamento Probabilístico",  en: "Probabilistic Thinking",     es: "Pensamiento Probabilístico"   }, 8,  2, ["foundations_decision_making"]),
  // economics (lição 5)
  L("economics_trade",             "economics",         5, { pt: "Comércio Internacional",     en: "International Trade",        es: "Comercio Internacional"       }, 9,  2, ["economics_fiscal_policy"]),
  // history
  L("history",                     "history",           1, { pt: "O que a História Ensina",    en: "What History Teaches",       es: "Lo que la Historia Enseña"    }, 7,  1, []),
  L("history_wwii",                "history",           2, { pt: "Segunda Guerra Mundial",     en: "World War II",               es: "Segunda Guerra Mundial"       }, 10, 2, ["history"]),
  L("history_cold_war",            "history",           3, { pt: "A Guerra Fria",              en: "The Cold War",               es: "La Guerra Fría"               }, 9,  2, ["history"]),
  L("history_colonialism",         "history",           4, { pt: "Colonialismo e Descolonização", en: "Colonialism and Decolonization", es: "Colonialismo y Descolonización" }, 10, 3, ["history_wwii", "history_cold_war"]),
  L("history_industrial_revolution","history",          5, { pt: "A Revolução Industrial",     en: "The Industrial Revolution",  es: "La Revolución Industrial"     }, 9,  2, ["history_cold_war"]),
  // psychology
  L("psychology",                  "psychology",        1, { pt: "Como a Mente Funciona",      en: "How the Mind Works",         es: "Cómo Funciona la Mente"       }, 7,  1, []),
  L("psychology_emotions",         "psychology",        2, { pt: "Emoções e Decisões",         en: "Emotions and Decisions",     es: "Emociones y Decisiones"       }, 8,  2, ["psychology"]),
  L("psychology_habits",           "psychology",        3, { pt: "A Ciência dos Hábitos",      en: "The Science of Habits",      es: "La Ciencia de los Hábitos"    }, 9,  2, ["psychology"]),
  L("psychology_social",           "psychology",        4, { pt: "Psicologia Social",          en: "Social Psychology",          es: "Psicología Social"            }, 9,  2, ["psychology_emotions", "psychology_habits"]),
  L("psychology_resilience",       "psychology",        5, { pt: "Resiliência Mental",         en: "Mental Resilience",          es: "Resiliencia Mental"           }, 8,  2, ["psychology_social"]),
];

export function getLessonMeta(contentId: string): LessonMeta | undefined {
  return BUNDLED_LESSONS.find((l) => l.id === contentId);
}

/** All published free lessons for the given tracks, sorted by track order
 *  then lesson order within track. */
function availableLessons(trackIds: string[]): LessonMeta[] {
  return BUNDLED_LESSONS
    .filter((l) => trackIds.includes(l.trackId) && l.status === "published" && l.tier === "free")
    .sort((a, b) => {
      const tA = trackIds.indexOf(a.trackId);
      const tB = trackIds.indexOf(b.trackId);
      return tA !== tB ? tA - tB : a.order - b.order;
    });
}

/** Returns the contentId of the next lesson the user should study.
 *  - Prefers the next uncompleted lesson in the same track as currentContentId.
 *  - Falls back to any uncompleted lesson across selected tracks.
 *  - Falls back to date-based rotation within the same track when all done. */
export function pickNextLesson(
  trackIds: string[],
  completedIds: string[],
  dateStr: string,
  currentContentId?: string,
): string | null {
  const lessons = availableLessons(trackIds);
  if (!lessons.length) return null;

  const currentTrackId = currentContentId
    ? BUNDLED_LESSONS.find((l) => l.id === currentContentId)?.trackId
    : undefined;

  const isReady = (l: LessonMeta) =>
    !completedIds.includes(l.id) &&
    l.prerequisites.every((p) => completedIds.includes(p));

  // 1. Next uncompleted in same track
  if (currentTrackId) {
    const sameTrackNext = lessons.find((l) => l.trackId === currentTrackId && isReady(l));
    if (sameTrackNext) return sameTrackNext.id;
  }

  // 2. Next uncompleted in any selected track
  const anyNext = lessons.find(isReady);
  if (anyNext) return anyNext.id;

  // 3. All done — rotate within same track for review, else full pool
  const pool = currentTrackId
    ? lessons.filter((l) => l.trackId === currentTrackId)
    : lessons;
  const reviewPool = pool.length > 0 ? pool : lessons;
  const n = dateStr.replace(/-/g, "").split("").reduce((a, c) => a * 10 + Number(c), 0);
  return reviewPool[n % reviewPool.length].id;
}

/** Returns the next available lesson ID per track (for secondary home cards). */
export function getNextLessonPerTrack(
  trackIds: string[],
  completedIds: string[],
): Record<string, string | null> {
  const result: Record<string, string | null> = {};
  for (const trackId of trackIds) {
    const lessons = BUNDLED_LESSONS
      .filter((l) => l.trackId === trackId && l.status === "published" && l.tier === "free")
      .sort((a, b) => a.order - b.order);
    const next = lessons.find(
      (l) => !completedIds.includes(l.id) &&
             l.prerequisites.every((p) => completedIds.includes(p)),
    ) ?? lessons[0] ?? null;
    result[trackId] = next?.id ?? null;
  }
  return result;
}

export function getLessonCountForTrack(trackId: string): number {
  return BUNDLED_LESSONS.filter((l) => l.trackId === trackId).length;
}

/** Returns true when every published free lesson in the selected tracks is completed. */
export function isAllContentCompleted(trackIds: string[], completedIds: string[]): boolean {
  if (!trackIds.length) return false;
  const lessons = BUNDLED_LESSONS.filter(
    (l) => trackIds.includes(l.trackId) && l.status === "published" && l.tier === "free",
  );
  return lessons.length > 0 && lessons.every((l) => completedIds.includes(l.id));
}

/** All distinct trackIds that have at least one published lesson. */
export function getAllTrackIds(): string[] {
  return [...new Set(BUNDLED_LESSONS.filter((l) => l.status === "published").map((l) => l.trackId))];
}

/** Returns trackIds where every published free lesson has been completed. */
export function getCompletedTracks(completedIds: string[]): string[] {
  return getAllTrackIds().filter((trackId) => {
    const lessons = BUNDLED_LESSONS.filter(
      (l) => l.trackId === trackId && l.status === "published" && l.tier === "free",
    );
    return lessons.length > 0 && lessons.every((l) => completedIds.includes(l.id));
  });
}

export async function getLessonsByTrack(trackId: string): Promise<LessonMeta[]> {
  try {
    const q = query(
      collection(db, "lessons"),
      where("trackId", "==", trackId),
      orderBy("order"),
    );
    const snap = await getDocs(q);
    if (!snap.empty) {
      return snap.docs.map((d) => ({ id: d.id, ...d.data() } as LessonMeta));
    }
  } catch {
    // offline or missing index — fall through to bundled
  }
  return BUNDLED_LESSONS.filter((l) => l.trackId === trackId && l.status === "published");
}
