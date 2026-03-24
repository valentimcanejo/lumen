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
  L("critical_thinking",         "critical_thinking", 1, { pt: "O Equilíbrio de Poder",     en: "The Balance of Power",              es: "El Equilibrio de Poder"          }, 8,  2, []),
  L("critical_thinking_fallacies","critical_thinking",2, { pt: "Falácias Lógicas",           en: "Logical Fallacies",                 es: "Falacias Lógicas"                }, 9,  2, ["critical_thinking"]),
  L("critical_thinking_bias",    "critical_thinking", 3, { pt: "Vieses Cognitivos",          en: "Cognitive Biases",                  es: "Sesgos Cognitivos"               }, 10, 3, ["critical_thinking_fallacies"]),
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
 *  - Picks the first uncompleted lesson whose prerequisites are all met.
 *  - Falls back to date-based rotation when everything is done (for review). */
export function pickNextLesson(
  trackIds: string[],
  completedIds: string[],
  dateStr: string,
): string | null {
  const lessons = availableLessons(trackIds);
  if (!lessons.length) return null;
  const next = lessons.find(
    (l) => !completedIds.includes(l.id) &&
           l.prerequisites.every((p) => completedIds.includes(p)),
  );
  if (next) return next.id;
  // All done — date-rotation for spaced review
  const n = dateStr.replace(/-/g, "").split("").reduce((a, c) => a * 10 + Number(c), 0);
  return lessons[n % lessons.length].id;
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
