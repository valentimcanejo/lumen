export const PACKS = [
  {
    id: "critical_thinking",
    version: 1,
    lang: "pt",
    estimatedMinutes: 8,
    difficulty: 2,
    goalIds: ["world_affairs", "critical_thinking"],
    tags: ["geopolítica", "poder", "diplomacia"],

    lesson: {
      title: "O Equilíbrio de Poder",
      summary:
        "Como países evitam que uma única nação domine o sistema internacional.",
      audioUrl: "audio/balance_of_power/v1/pt.mp3",

      blocks: [
        {
          type: "h2",
          text: "O que é equilíbrio de poder?",
        },
        {
          type: "p",
          text: "O equilíbrio de poder é um princípio da política internacional segundo o qual nenhuma nação deve se tornar poderosa demais a ponto de dominar as outras.",
        },
        {
          type: "p",
          text: "Quando um país cresce rapidamente, os demais tendem a reagir formando alianças, aumentando seus gastos militares ou criando mecanismos de contenção.",
        },
        {
          type: "quote",
          text: "O poder não é algo que se possui isoladamente, mas algo que existe em relação aos outros.",
        },
        {
          type: "h2",
          text: "Por que isso importa?",
        },
        {
          type: "p",
          text: "Esse mecanismo ajuda a explicar por que grandes guerras muitas vezes surgem quando o equilíbrio é rompido — e por que alianças internacionais são tão comuns.",
        },
        {
          type: "bullets",
          items: [
            "Evita hegemonias absolutas",
            "Incentiva alianças estratégicas",
            "Reduz o risco de dominação total",
          ],
        },
      ],
    },

    cards: [
      {
        id: "c1",
        front: "O que é equilíbrio de poder?",
        back: "É a ideia de que nenhuma nação deve concentrar poder suficiente para dominar todas as outras.",
      },
      {
        id: "c2",
        front: "Como países reagem a um rival em ascensão?",
        back: "Formando alianças, reforçando capacidades militares ou adotando políticas de contenção.",
      },
      {
        id: "c3",
        front: "Qual o objetivo central do equilíbrio de poder?",
        back: "Manter estabilidade e evitar hegemonias no sistema internacional.",
      },
    ],

    quiz: [
      {
        id: "q1",
        question: "Qual é a principal função do equilíbrio de poder?",
        options: [
          "Promover a cooperação cultural",
          "Evitar que um único país domine os demais",
          "Eliminar conflitos internacionais",
          "Criar governos globais",
        ],
        answerIndex: 1,
        explanation:
          "O equilíbrio de poder busca impedir hegemonias, não eliminar conflitos ou criar governos globais.",
      },
      {
        id: "q2",
        question:
          "Qual dessas ações NÃO é típica de uma política de equilíbrio de poder?",
        options: [
          "Formação de alianças",
          "Aumento de gastos militares",
          "Neutralidade permanente",
          "Políticas de contenção",
        ],
        answerIndex: 2,
        explanation:
          "Neutralidade permanente não é uma resposta ativa ao desequilíbrio de poder.",
      },
    ],
  },
];
