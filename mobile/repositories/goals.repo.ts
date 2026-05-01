import type { Lang } from "../models/lang";

export type Goal = {
  id: string;
  order: number;
  icon: string;
  emoji: string;
  color: string;
  title: Record<Lang, string>;
  description?: Record<Lang, string>;
};

const BUNDLED_GOALS: Goal[] = [
  {
    id: "foundations",
    order: 0,
    icon: "book",
    emoji: "📚",
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
    emoji: "🧠",
    color: "#F5C77A",
    title: { pt: "Pensamento crítico", en: "Critical thinking", es: "Pensamiento crítico" },
    description: {
      pt: "Analisar ideias, argumentos e informações com profundidade",
      en: "Analyze ideas, arguments and information deeply",
      es: "Analizar ideas, argumentos e información en profundidad",
    },
  },
  {
    id: "philosophy",
    order: 2,
    icon: "brain",
    emoji: "💡",
    color: "#60A5FA",
    title: { pt: "Filosofia", en: "Philosophy", es: "Filosofía" },
    description: {
      pt: "As grandes questões sobre existência, conhecimento e moral",
      en: "The great questions about existence, knowledge and morality",
      es: "Las grandes preguntas sobre existencia, conocimiento y moral",
    },
  },
  {
    id: "psychology",
    order: 3,
    icon: "person",
    emoji: "🧘",
    color: "#B07BE0",
    title: { pt: "Psicologia", en: "Psychology", es: "Psicología" },
    description: {
      pt: "Como a mente humana pensa, sente e se comporta",
      en: "How the human mind thinks, feels and behaves",
      es: "Cómo la mente humana piensa, siente y se comporta",
    },
  },
  {
    id: "history",
    order: 4,
    icon: "hourglass",
    emoji: "⏳",
    color: "#E0A87B",
    title: { pt: "História", en: "History", es: "Historia" },
    description: {
      pt: "Entender os eventos que moldaram o mundo em que vivemos",
      en: "Understand the events that shaped the world we live in",
      es: "Entender los eventos que moldearon el mundo en que vivimos",
    },
  },
  {
    id: "geopolitics",
    order: 5,
    icon: "globe",
    emoji: "🌍",
    color: "#5ED19A",
    title: { pt: "Geopolítica", en: "Geopolitics", es: "Geopolítica" },
    description: {
      pt: "Entender as relações de poder entre países e regiões",
      en: "Understand power relations between countries and regions",
      es: "Entender las relaciones de poder entre países y regiones",
    },
  },
  {
    id: "politics",
    order: 6,
    icon: "globe",
    emoji: "🏛️",
    color: "#F87171",
    title: { pt: "Política", en: "Politics", es: "Política" },
    description: {
      pt: "Como o poder é organizado e exercido nas sociedades",
      en: "How power is organized and exercised in societies",
      es: "Cómo el poder se organiza y ejerce en las sociedades",
    },
  },
  {
    id: "economics",
    order: 7,
    icon: "chart",
    emoji: "📈",
    color: "#AAB0C0",
    title: { pt: "Economia", en: "Economics", es: "Economía" },
    description: {
      pt: "Compreender como mercados, dinheiro e decisões moldam o mundo",
      en: "Understand how markets, money and decisions shape the world",
      es: "Comprender cómo los mercados, el dinero y las decisiones moldean el mundo",
    },
  },
  {
    id: "business",
    order: 8,
    icon: "chart",
    emoji: "💼",
    color: "#FBBF24",
    title: { pt: "Negócios", en: "Business", es: "Negocios" },
    description: {
      pt: "Estratégia, empreendedorismo e como empresas crescem",
      en: "Strategy, entrepreneurship and how companies grow",
      es: "Estrategia, emprendimiento y cómo crecen las empresas",
    },
  },
  {
    id: "science",
    order: 9,
    icon: "brain",
    emoji: "🔬",
    color: "#34D399",
    title: { pt: "Ciência", en: "Science", es: "Ciencia" },
    description: {
      pt: "As descobertas que transformaram nossa compreensão do universo",
      en: "The discoveries that transformed our understanding of the universe",
      es: "Los descubrimientos que transformaron nuestra comprensión del universo",
    },
  },
  {
    id: "cosmos",
    order: 10,
    icon: "planet",
    emoji: "🔭",
    color: "#818CF8",
    title: { pt: "Cosmos", en: "Cosmos", es: "Cosmos" },
    description: {
      pt: "Do Big Bang à busca por vida inteligente no universo",
      en: "From the Big Bang to the search for intelligent life",
      es: "Del Big Bang a la búsqueda de vida inteligente en el universo",
    },
  },
  {
    id: "health",
    order: 11,
    icon: "heart",
    emoji: "❤️",
    color: "#4ADE80",
    title: { pt: "Saúde", en: "Health", es: "Salud" },
    description: {
      pt: "Como seu corpo funciona e o que a ciência diz sobre viver melhor",
      en: "How your body works and what science says about living better",
      es: "Cómo funciona tu cuerpo y qué dice la ciencia sobre vivir mejor",
    },
  },
];

export function getBundledGoals(): Goal[] {
  return BUNDLED_GOALS;
}

export function getGoals(): Goal[] {
  return BUNDLED_GOALS;
}
