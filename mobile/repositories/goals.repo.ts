import { collection, getDocs, query, orderBy } from "firebase/firestore";
import { db } from "../firebase/firebaseConfig";
import type { Lang } from "../models/lang";

export type Goal = {
  id: string;
  order: number;
  icon: string;
  color: string;
  title: Record<Lang, string>;
  description?: Record<Lang, string>;
};

const BUNDLED_GOALS: Goal[] = [
  {
    id: "foundations",
    order: 0,
    icon: "book",
    color: "#7B8FE0",
    title: { pt: "Fundamentos", en: "Foundations", es: "Fundamentos" },
    description: {
      pt: "Construir uma base sólida de pensamento e raciocínio",
      en: "Build a solid foundation of thinking and reasoning",
      es: "Construir una base sólida de pensamiento y razonamiento",
    },
  },
  {
    id: "critical_thinking",
    order: 1,
    icon: "brain",
    color: "#F5C77A",
    title: { pt: "Pensamento crítico", en: "Critical thinking", es: "Pensamiento crítico" },
    description: {
      pt: "Analisar ideias, argumentos e informações com profundidade",
      en: "Analyze ideas, arguments and information deeply",
      es: "Analizar ideas, argumentos e información en profundidad",
    },
  },
  {
    id: "geopolitics",
    order: 2,
    icon: "globe",
    color: "#5ED19A",
    title: { pt: "Geopolítica", en: "Geopolitics", es: "Geopolítica" },
    description: {
      pt: "Entender as relações de poder entre países e regiões",
      en: "Understand power relations between countries and regions",
      es: "Entender las relaciones de poder entre países y regiones",
    },
  },
  {
    id: "economics",
    order: 3,
    icon: "chart",
    color: "#AAB0C0",
    title: { pt: "Economia", en: "Economics", es: "Economía" },
    description: {
      pt: "Compreender como mercados, dinheiro e decisões moldam o mundo",
      en: "Understand how markets, money and decisions shape the world",
      es: "Comprender cómo los mercados, el dinero y las decisiones moldean el mundo",
    },
  },
  {
    id: "history",
    order: 4,
    icon: "hourglass",
    color: "#E0A87B",
    title: { pt: "História", en: "History", es: "Historia" },
    description: {
      pt: "Entender os eventos que moldaram o mundo em que vivemos",
      en: "Understand the events that shaped the world we live in",
      es: "Entender los eventos que moldearon el mundo en que vivimos",
    },
  },
  {
    id: "psychology",
    order: 5,
    icon: "person",
    color: "#B07BE0",
    title: { pt: "Psicologia", en: "Psychology", es: "Psicología" },
    description: {
      pt: "Como a mente humana pensa, sente e se comporta",
      en: "How the human mind thinks, feels and behaves",
      es: "Cómo la mente humana piensa, siente y se comporta",
    },
  },
];

export function getBundledGoals(): Goal[] {
  return BUNDLED_GOALS;
}

export async function getGoals(): Promise<Goal[]> {
  const q = query(collection(db, "goals"), orderBy("order"));
  const snap = await getDocs(q);
  const remote = snap.docs
    .map((d) => ({ id: d.id, ...d.data() }) as Goal & { isActive?: boolean })
    .filter((g) => g.isActive !== false);
  return remote.length > 0 ? remote : BUNDLED_GOALS;
}
