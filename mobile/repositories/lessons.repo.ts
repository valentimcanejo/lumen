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
    id: "foundations",
    trackId: "foundations",
    version: 1,
    order: 1,
    title: { pt: "Pensamento Sistêmico", en: "Systems Thinking", es: "Pensamiento Sistémico" },
    estimatedMinutes: 7,
    difficulty: 1,
  },
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
    id: "economics",
    trackId: "economics",
    version: 1,
    order: 1,
    title: { pt: "O que é o PIB?", en: "What is GDP?", es: "¿Qué es el PIB?" },
    estimatedMinutes: 7,
    difficulty: 2,
  },
];

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
