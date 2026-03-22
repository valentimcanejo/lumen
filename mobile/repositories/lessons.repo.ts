import { collection, getDocs, query, where, orderBy } from "firebase/firestore";
import { db } from "../firebase/firebaseConfig";
import type { Lang } from "../models/lang";

export type LessonMeta = {
  id: string;          // contentId — used to load the pack
  trackId: string;
  version: number;
  order: number;
  title: Partial<Record<Lang, string>>;
  estimatedMinutes: number;
  difficulty: 1 | 2 | 3;
};

// Bundled fallback so the screen works offline
const BUNDLED_LESSONS: LessonMeta[] = [
  // foundations
  { id: "foundations", trackId: "foundations", version: 1, order: 1, title: { pt: "Pensamento Sistêmico", en: "Systems Thinking", es: "Pensamiento Sistémico" }, estimatedMinutes: 7, difficulty: 1 },
  { id: "foundations_mental_models", trackId: "foundations", version: 1, order: 2, title: { pt: "Modelos Mentais", en: "Mental Models", es: "Modelos Mentales" }, estimatedMinutes: 8, difficulty: 1 },
  { id: "foundations_first_principles", trackId: "foundations", version: 1, order: 3, title: { pt: "Primeiros Princípios", en: "First Principles", es: "Primeros Principios" }, estimatedMinutes: 8, difficulty: 2 },
  // geopolitics
  { id: "geopolitics", trackId: "geopolitics", version: 1, order: 1, title: { pt: "Esfera de Influência", en: "Sphere of Influence", es: "Esfera de Influencia" }, estimatedMinutes: 8, difficulty: 2 },
  { id: "geopolitics_nato", trackId: "geopolitics", version: 1, order: 2, title: { pt: "A OTAN e o Atlântico", en: "NATO and the Atlantic", es: "La OTAN y el Atlántico" }, estimatedMinutes: 9, difficulty: 2 },
  { id: "geopolitics_brics", trackId: "geopolitics", version: 1, order: 3, title: { pt: "BRICS e o Sul Global", en: "BRICS and the Global South", es: "BRICS y el Sur Global" }, estimatedMinutes: 9, difficulty: 2 },
  // economics
  { id: "economics", trackId: "economics", version: 1, order: 1, title: { pt: "O que é o PIB?", en: "What is GDP?", es: "¿Qué es el PIB?" }, estimatedMinutes: 7, difficulty: 2 },
  { id: "economics_inflation", trackId: "economics", version: 1, order: 2, title: { pt: "Inflação e Poder de Compra", en: "Inflation and Purchasing Power", es: "Inflación y Poder Adquisitivo" }, estimatedMinutes: 8, difficulty: 2 },
  { id: "economics_interest_rates", trackId: "economics", version: 1, order: 3, title: { pt: "Juros e Bancos Centrais", en: "Interest Rates and Central Banks", es: "Tasas de Interés y Bancos Centrales" }, estimatedMinutes: 9, difficulty: 3 },
  // critical_thinking
  { id: "critical_thinking", trackId: "critical_thinking", version: 1, order: 1, title: { pt: "O Equilíbrio de Poder", en: "The Balance of Power", es: "El Equilibrio de Poder" }, estimatedMinutes: 8, difficulty: 2 },
  { id: "critical_thinking_fallacies", trackId: "critical_thinking", version: 1, order: 2, title: { pt: "Falácias Lógicas", en: "Logical Fallacies", es: "Falacias Lógicas" }, estimatedMinutes: 9, difficulty: 2 },
  { id: "critical_thinking_bias", trackId: "critical_thinking", version: 1, order: 3, title: { pt: "Vieses Cognitivos", en: "Cognitive Biases", es: "Sesgos Cognitivos" }, estimatedMinutes: 10, difficulty: 3 },
];

export function getLessonCountForTrack(trackId: string): number {
  return BUNDLED_LESSONS.filter((l) => l.trackId === trackId).length;
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
  return BUNDLED_LESSONS.filter((l) => l.trackId === trackId);
}
