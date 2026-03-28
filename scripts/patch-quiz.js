#!/usr/bin/env node
/**
 * patch-quiz.js
 *
 * For each of the 26 packs in Firebase Storage (v1, 2 questions each):
 *   1. Download the existing JSON
 *   2. Add a 3rd quiz question
 *   3. Upload as v2
 *
 * For the 4 packs that have NO Firebase Storage content yet
 * (critical_thinking_scientific, critical_thinking_rhetoric,
 *  foundations_probabilistic, economics_trade):
 *   — skipped here; create them separately with generate-packs.js
 *
 * Run: node scripts/patch-quiz.js
 * Requires: scripts/serviceAccountKey.json
 */

const admin = require("firebase-admin");
const path  = require("path");

const serviceAccount = require(path.join(__dirname, "serviceAccountKey.json"));
admin.initializeApp({
  credential: admin.credential.cert(serviceAccount),
  storageBucket: "lumen-13d0d.firebasestorage.app",
});
const bucket = admin.storage().bucket();

// ---------------------------------------------------------------------------
// 3rd questions: one per pack ID, in all 3 languages
// ---------------------------------------------------------------------------

const Q3 = {
  foundations: {
    pt: {
      question: "O que diferencia um loop de reforço de um loop balanceador em um sistema?",
      options: [
        "O loop de reforço amplifica mudanças; o balanceador as estabiliza",
        "O loop de reforço reduz mudanças; o balanceador as aumenta",
        "São termos distintos para o mesmo fenômeno",
        "O loop balanceador sempre leva ao colapso do sistema",
      ],
      answerIndex: 0,
      explanation: "Loops de reforço amplificam variações (crescimento ou colapso), enquanto loops balanceadores resistem à mudança e buscam equilíbrio.",
    },
    en: {
      question: "What differentiates a reinforcing loop from a balancing loop in a system?",
      options: [
        "A reinforcing loop amplifies changes; a balancing loop stabilizes them",
        "A reinforcing loop reduces changes; a balancing loop increases them",
        "They are different terms for the same phenomenon",
        "A balancing loop always leads to system collapse",
      ],
      answerIndex: 0,
      explanation: "Reinforcing loops amplify variations (growth or collapse), while balancing loops resist change and seek equilibrium.",
    },
    es: {
      question: "¿Qué diferencia un bucle de refuerzo de un bucle de equilibrio en un sistema?",
      options: [
        "El bucle de refuerzo amplifica los cambios; el de equilibrio los estabiliza",
        "El bucle de refuerzo reduce los cambios; el de equilibrio los aumenta",
        "Son términos distintos para el mismo fenómeno",
        "El bucle de equilibrio siempre lleva al colapso del sistema",
      ],
      answerIndex: 0,
      explanation: "Los bucles de refuerzo amplían las variaciones (crecimiento o colapso), mientras que los de equilibrio resisten el cambio y buscan la estabilidad.",
    },
  },

  foundations_mental_models: {
    pt: {
      question: "O que é o 'martelo de Maslow' como modelo mental?",
      options: [
        "A tendência de resolver todos os problemas com a ferramenta que você conhece melhor",
        "A hierarquia das necessidades aplicada a decisões",
        "Um modelo para priorizar tarefas urgentes",
        "A ideia de que ferramentas simples sempre superam as complexas",
      ],
      answerIndex: 0,
      explanation: "O martelo de Maslow ilustra como quem só sabe usar um martelo vê tudo como prego — a superexposição a um único modelo limita a visão.",
    },
    en: {
      question: "What is 'Maslow's Hammer' as a mental model?",
      options: [
        "The tendency to solve all problems with the tool you know best",
        "The hierarchy of needs applied to decisions",
        "A model for prioritizing urgent tasks",
        "The idea that simple tools always outperform complex ones",
      ],
      answerIndex: 0,
      explanation: "Maslow's Hammer illustrates how someone who only knows how to use a hammer sees everything as a nail — over-reliance on a single model limits perspective.",
    },
    es: {
      question: "¿Qué es el 'martillo de Maslow' como modelo mental?",
      options: [
        "La tendencia a resolver todos los problemas con la herramienta que mejor conoces",
        "La jerarquía de necesidades aplicada a las decisiones",
        "Un modelo para priorizar tareas urgentes",
        "La idea de que las herramientas simples siempre superan a las complejas",
      ],
      answerIndex: 0,
      explanation: "El martillo de Maslow ilustra cómo quien solo sabe usar un martillo ve todo como clavo — depender demasiado de un único modelo limita la perspectiva.",
    },
  },

  foundations_first_principles: {
    pt: {
      question: "Por que o raciocínio por primeiros princípios é mais difícil de aplicar do que o raciocínio por analogia?",
      options: [
        "Exige desconstruir suposições e reconstruir a partir do zero, o que demanda esforço maior",
        "Porque é uma técnica que só pode ser ensinada em universidades",
        "Por depender de comparações com exemplos do passado",
        "Não é mais difícil — na prática, é sempre mais rápido",
      ],
      answerIndex: 0,
      explanation: "O raciocínio por primeiros princípios exige questionar cada premissa até chegar às verdades fundamentais, ao contrário da analogia, que reutiliza soluções conhecidas.",
    },
    en: {
      question: "Why is first principles reasoning harder to apply than reasoning by analogy?",
      options: [
        "It requires deconstructing assumptions and rebuilding from scratch, demanding greater effort",
        "Because it is a technique that can only be taught at universities",
        "Because it depends on comparisons with past examples",
        "It is not harder — in practice, it is always faster",
      ],
      answerIndex: 0,
      explanation: "First principles reasoning requires questioning each premise down to fundamental truths, unlike analogy which reuses known solutions.",
    },
    es: {
      question: "¿Por qué el razonamiento desde primeros principios es más difícil de aplicar que el razonamiento por analogía?",
      options: [
        "Requiere deconstruir supuestos y reconstruir desde cero, exigiendo mayor esfuerzo",
        "Porque es una técnica que solo puede enseñarse en universidades",
        "Porque depende de comparaciones con ejemplos del pasado",
        "No es más difícil: en la práctica, siempre es más rápido",
      ],
      answerIndex: 0,
      explanation: "El razonamiento desde primeros principios requiere cuestionar cada premisa hasta llegar a las verdades fundamentales, a diferencia de la analogía que reutiliza soluciones conocidas.",
    },
  },

  foundations_decision_making: {
    pt: {
      question: "O que é a aversão à perda na tomada de decisão?",
      options: [
        "A tendência de sentir perdas mais intensamente do que ganhos equivalentes",
        "A preferência por decisões que evitam qualquer risco",
        "A incapacidade de tomar decisões sob pressão",
        "O comportamento de adiar escolhas difíceis indefinidamente",
      ],
      answerIndex: 0,
      explanation: "A aversão à perda, estudada por Kahneman e Tversky, mostra que perdas têm impacto psicológico cerca de duas vezes maior que ganhos do mesmo valor.",
    },
    en: {
      question: "What is loss aversion in decision making?",
      options: [
        "The tendency to feel losses more intensely than equivalent gains",
        "The preference for decisions that avoid any risk",
        "The inability to make decisions under pressure",
        "The behavior of postponing difficult choices indefinitely",
      ],
      answerIndex: 0,
      explanation: "Loss aversion, studied by Kahneman and Tversky, shows that losses have about twice the psychological impact of equivalent gains.",
    },
    es: {
      question: "¿Qué es la aversión a la pérdida en la toma de decisiones?",
      options: [
        "La tendencia a sentir las pérdidas más intensamente que las ganancias equivalentes",
        "La preferencia por decisiones que evitan cualquier riesgo",
        "La incapacidad de tomar decisiones bajo presión",
        "El comportamiento de posponer indefinidamente las elecciones difíciles",
      ],
      answerIndex: 0,
      explanation: "La aversión a la pérdida, estudiada por Kahneman y Tversky, muestra que las pérdidas tienen un impacto psicológico aproximadamente el doble que las ganancias equivalentes.",
    },
  },

  geopolitics: {
    pt: {
      question: "Qual é o principal risco para um país que aceita grandes investimentos de uma potência com esfera de influência expansiva?",
      options: [
        "Dependência econômica que pode ser convertida em pressão política",
        "Aumento imediato das taxas de inflação",
        "Perda do idioma nacional pela influência cultural",
        "Redução automática do PIB do país receptor",
      ],
      answerIndex: 0,
      explanation: "Investimentos estratégicos de grandes potências frequentemente criam laços de dependência que limitam a soberania do país receptor em decisões políticas.",
    },
    en: {
      question: "What is the main risk for a country that accepts large investments from an expansive sphere-of-influence power?",
      options: [
        "Economic dependence that can be converted into political pressure",
        "Immediate increase in inflation rates",
        "Loss of national language through cultural influence",
        "Automatic reduction of the recipient country's GDP",
      ],
      answerIndex: 0,
      explanation: "Strategic investments from major powers frequently create dependency ties that limit the recipient country's sovereignty in political decisions.",
    },
    es: {
      question: "¿Cuál es el principal riesgo para un país que acepta grandes inversiones de una potencia con esfera de influencia expansiva?",
      options: [
        "Dependencia económica que puede convertirse en presión política",
        "Aumento inmediato de las tasas de inflación",
        "Pérdida del idioma nacional por influencia cultural",
        "Reducción automática del PIB del país receptor",
      ],
      answerIndex: 0,
      explanation: "Las inversiones estratégicas de grandes potencias frecuentemente crean lazos de dependencia que limitan la soberanía del país receptor en decisiones políticas.",
    },
  },

  geopolitics_nato: {
    pt: {
      question: "Por que a expansão da OTAN em direção ao leste europeu é vista pela Rússia como uma ameaça?",
      options: [
        "A Rússia considera o avanço da OTAN uma violação de sua zona de influência histórica",
        "Porque a OTAN proibiu o uso do idioma russo em países membros",
        "Por razões exclusivamente econômicas relacionadas ao comércio de energia",
        "Porque a OTAN cobra tarifas de passagem em rotas aéreas russas",
      ],
      answerIndex: 0,
      explanation: "A Rússia interpreta a aproximação da OTAN de suas fronteiras como cerco estratégico, o que influenciou diretamente tensões como a crise na Ucrânia.",
    },
    en: {
      question: "Why does Russia view NATO's eastward expansion as a threat?",
      options: [
        "Russia considers NATO's advance a violation of its historical sphere of influence",
        "Because NATO banned the use of the Russian language in member countries",
        "For purely economic reasons related to energy trade",
        "Because NATO charges transit fees on Russian air routes",
      ],
      answerIndex: 0,
      explanation: "Russia interprets NATO's approach to its borders as strategic encirclement, which directly influenced tensions such as the Ukraine crisis.",
    },
    es: {
      question: "¿Por qué Rusia ve la expansión de la OTAN hacia el este de Europa como una amenaza?",
      options: [
        "Rusia considera el avance de la OTAN una violación de su esfera de influencia histórica",
        "Porque la OTAN prohibió el uso del idioma ruso en los países miembros",
        "Por razones exclusivamente económicas relacionadas con el comercio de energía",
        "Porque la OTAN cobra tarifas de tránsito en rutas aéreas rusas",
      ],
      answerIndex: 0,
      explanation: "Rusia interpreta la aproximación de la OTAN a sus fronteras como un cerco estratégico, lo que influyó directamente en tensiones como la crisis en Ucrania.",
    },
  },

  geopolitics_brics: {
    pt: {
      question: "Qual é o principal desafio interno do BRICS como aliança geopolítica?",
      options: [
        "A heterogeneidade política e econômica entre os membros dificulta posições unificadas",
        "A ausência de um idioma comum para as negociações",
        "O fato de nenhum membro ser exportador de petróleo",
        "A proibição de membros manterem relações comerciais com países ocidentais",
      ],
      answerIndex: 0,
      explanation: "O BRICS reúne democracias, autocracias e economias em diferentes estágios, o que torna difícil construir consenso em temas como direitos humanos ou política externa.",
    },
    en: {
      question: "What is the main internal challenge of BRICS as a geopolitical alliance?",
      options: [
        "The political and economic heterogeneity among members makes unified positions difficult",
        "The absence of a common language for negotiations",
        "The fact that no member is an oil exporter",
        "The ban on members maintaining trade relations with Western countries",
      ],
      answerIndex: 0,
      explanation: "BRICS brings together democracies, autocracies, and economies at different stages, making it difficult to build consensus on issues like human rights or foreign policy.",
    },
    es: {
      question: "¿Cuál es el principal desafío interno del BRICS como alianza geopolítica?",
      options: [
        "La heterogeneidad política y económica entre los miembros dificulta posiciones unificadas",
        "La ausencia de un idioma común para las negociaciones",
        "El hecho de que ningún miembro sea exportador de petróleo",
        "La prohibición a los miembros de mantener relaciones comerciales con países occidentales",
      ],
      answerIndex: 0,
      explanation: "El BRICS reúne democracias, autocracias y economías en diferentes etapas, lo que dificulta construir consenso en temas como derechos humanos o política exterior.",
    },
  },

  geopolitics_middle_east: {
    pt: {
      question: "Qual divisão religiosa alimenta boa parte dos conflitos no Oriente Médio contemporâneo?",
      options: [
        "A rivalidade entre o Islã sunita (Arábia Saudita) e o xiita (Irã)",
        "O conflito entre cristãos e muçulmanos em toda a região",
        "A disputa entre judeus ortodoxos e seculares em Israel",
        "A oposição entre budistas e muçulmanos no Iraque",
      ],
      answerIndex: 0,
      explanation: "A rivalidade sunita-xiita, liderada por Arábia Saudita e Irã respectivamente, atravessa conflitos no Iêmen, Síria, Líbano e Iraque.",
    },
    en: {
      question: "What religious division fuels much of the conflict in the contemporary Middle East?",
      options: [
        "The rivalry between Sunni Islam (Saudi Arabia) and Shia (Iran)",
        "The conflict between Christians and Muslims across the region",
        "The dispute between Orthodox and secular Jews in Israel",
        "The opposition between Buddhists and Muslims in Iraq",
      ],
      answerIndex: 0,
      explanation: "The Sunni-Shia rivalry, led by Saudi Arabia and Iran respectively, runs through conflicts in Yemen, Syria, Lebanon, and Iraq.",
    },
    es: {
      question: "¿Qué división religiosa alimenta gran parte de los conflictos en el Oriente Medio contemporáneo?",
      options: [
        "La rivalidad entre el Islam sunita (Arabia Saudita) y el chiita (Irán)",
        "El conflicto entre cristianos y musulmanes en toda la región",
        "La disputa entre judíos ortodoxos y seculares en Israel",
        "La oposición entre budistas y musulmanes en Irak",
      ],
      answerIndex: 0,
      explanation: "La rivalidad sunita-chiita, liderada por Arabia Saudita e Irán respectivamente, atraviesa conflictos en Yemen, Siria, Líbano e Irak.",
    },
  },

  geopolitics_china_usa: {
    pt: {
      question: "O que é desacoplamento tecnológico no contexto da rivalidade EUA-China?",
      options: [
        "A separação intencional das cadeias de tecnologia e fornecimento entre as duas potências",
        "A transferência de tecnologia americana para empresas chinesas",
        "A unificação dos padrões tecnológicos globais por acordo bilateral",
        "A substituição de chips americanos por europeus no mercado global",
      ],
      answerIndex: 0,
      explanation: "O desacoplamento tecnológico é a estratégia de reduzir a interdependência em setores críticos como semicondutores, 5G e inteligência artificial.",
    },
    en: {
      question: "What is technological decoupling in the context of the US-China rivalry?",
      options: [
        "The intentional separation of technology and supply chains between the two powers",
        "The transfer of American technology to Chinese companies",
        "The unification of global technology standards by bilateral agreement",
        "The replacement of American chips with European ones in global markets",
      ],
      answerIndex: 0,
      explanation: "Technological decoupling is the strategy of reducing interdependence in critical sectors such as semiconductors, 5G, and artificial intelligence.",
    },
    es: {
      question: "¿Qué es el desacoplamiento tecnológico en el contexto de la rivalidad EE.UU.-China?",
      options: [
        "La separación intencional de las cadenas de tecnología y suministro entre las dos potencias",
        "La transferencia de tecnología estadounidense a empresas chinas",
        "La unificación de los estándares tecnológicos globales por acuerdo bilateral",
        "La sustitución de chips estadounidenses por europeos en los mercados globales",
      ],
      answerIndex: 0,
      explanation: "El desacoplamiento tecnológico es la estrategia de reducir la interdependencia en sectores críticos como semiconductores, 5G e inteligencia artificial.",
    },
  },

  economics: {
    pt: {
      question: "Qual a diferença entre PIB nominal e PIB real?",
      options: [
        "O PIB real ajusta pelo efeito da inflação; o nominal não",
        "O PIB nominal inclui serviços; o real apenas bens físicos",
        "O PIB real é calculado pelo setor privado; o nominal pelo governo",
        "São iguais, mas expressos em moedas diferentes",
      ],
      answerIndex: 0,
      explanation: "O PIB real desconta a inflação para comparar o crescimento efetivo da produção ao longo do tempo, enquanto o nominal reflete preços correntes.",
    },
    en: {
      question: "What is the difference between nominal GDP and real GDP?",
      options: [
        "Real GDP adjusts for inflation; nominal GDP does not",
        "Nominal GDP includes services; real GDP only physical goods",
        "Real GDP is calculated by the private sector; nominal by the government",
        "They are the same but expressed in different currencies",
      ],
      answerIndex: 0,
      explanation: "Real GDP discounts inflation to compare actual production growth over time, while nominal GDP reflects current prices.",
    },
    es: {
      question: "¿Cuál es la diferencia entre PIB nominal y PIB real?",
      options: [
        "El PIB real ajusta por el efecto de la inflación; el nominal no",
        "El PIB nominal incluye servicios; el real solo bienes físicos",
        "El PIB real lo calcula el sector privado; el nominal el gobierno",
        "Son iguales, pero expresados en monedas distintas",
      ],
      answerIndex: 0,
      explanation: "El PIB real descuenta la inflación para comparar el crecimiento efectivo de la producción a lo largo del tiempo, mientras el nominal refleja los precios actuales.",
    },
  },

  economics_inflation: {
    pt: {
      question: "Como um banco central combate a inflação?",
      options: [
        "Aumentando as taxas de juros para encarecer o crédito e desacelerar a economia",
        "Imprimindo mais dinheiro para aumentar a oferta",
        "Reduzindo impostos para estimular o consumo",
        "Aumentando os gastos públicos em infraestrutura",
      ],
      answerIndex: 0,
      explanation: "Juros mais altos reduzem o crédito disponível, freiam o consumo e o investimento, diminuindo a pressão sobre os preços.",
    },
    en: {
      question: "How does a central bank combat inflation?",
      options: [
        "By raising interest rates to make credit more expensive and slow the economy",
        "By printing more money to increase supply",
        "By reducing taxes to stimulate consumption",
        "By increasing public spending on infrastructure",
      ],
      answerIndex: 0,
      explanation: "Higher interest rates reduce available credit, restrain consumption and investment, easing pressure on prices.",
    },
    es: {
      question: "¿Cómo combate la inflación un banco central?",
      options: [
        "Aumentando las tasas de interés para encarecer el crédito y desacelerar la economía",
        "Imprimiendo más dinero para aumentar la oferta",
        "Reduciendo impuestos para estimular el consumo",
        "Aumentando el gasto público en infraestructura",
      ],
      answerIndex: 0,
      explanation: "Las tasas de interés más altas reducen el crédito disponible, frenan el consumo y la inversión, disminuyendo la presión sobre los precios.",
    },
  },

  economics_interest_rates: {
    pt: {
      question: "Por que taxas de juros muito baixas por período prolongado podem ser prejudiciais à economia?",
      options: [
        "Podem inflar bolhas de ativos e gerar inflação excessiva",
        "Incentivam a poupança excessiva e reduzem o consumo",
        "Elevam automaticamente o desemprego",
        "Fortalecem a moeda nacional além do ideal",
      ],
      answerIndex: 0,
      explanation: "Juros baixos por muito tempo estimulam especulação e endividamento excessivo, criando bolhas nos mercados financeiros e imobiliários.",
    },
    en: {
      question: "Why can very low interest rates over a prolonged period be harmful to the economy?",
      options: [
        "They can inflate asset bubbles and generate excessive inflation",
        "They encourage excessive saving and reduce consumption",
        "They automatically raise unemployment",
        "They strengthen the national currency beyond the ideal",
      ],
      answerIndex: 0,
      explanation: "Low rates for too long encourage speculation and excessive borrowing, creating bubbles in financial and real estate markets.",
    },
    es: {
      question: "¿Por qué las tasas de interés muy bajas durante un período prolongado pueden ser perjudiciales para la economía?",
      options: [
        "Pueden inflar burbujas de activos y generar inflación excesiva",
        "Incentivan el ahorro excesivo y reducen el consumo",
        "Elevan automáticamente el desempleo",
        "Fortalecen la moneda nacional más de lo ideal",
      ],
      answerIndex: 0,
      explanation: "Las tasas bajas durante demasiado tiempo estimulan la especulación y el endeudamiento excesivo, creando burbujas en los mercados financieros e inmobiliarios.",
    },
  },

  economics_fiscal_policy: {
    pt: {
      question: "Qual é a diferença entre política fiscal expansionista e contracionista?",
      options: [
        "Expansionista aumenta gastos ou reduz impostos; contracionista faz o oposto",
        "Expansionista reduz a dívida pública; contracionista a aumenta",
        "Expansionista aplica-se apenas em períodos de guerra",
        "Contracionista é sempre prejudicial ao crescimento econômico",
      ],
      answerIndex: 0,
      explanation: "A política fiscal expansionista estimula a demanda em recessões; a contracionista resfria a economia em períodos de superaquecimento.",
    },
    en: {
      question: "What is the difference between expansionary and contractionary fiscal policy?",
      options: [
        "Expansionary increases spending or cuts taxes; contractionary does the opposite",
        "Expansionary reduces public debt; contractionary increases it",
        "Expansionary applies only during wartime",
        "Contractionary is always detrimental to economic growth",
      ],
      answerIndex: 0,
      explanation: "Expansionary fiscal policy stimulates demand during recessions; contractionary cools the economy during overheating periods.",
    },
    es: {
      question: "¿Cuál es la diferencia entre política fiscal expansionista y contraccionista?",
      options: [
        "La expansionista aumenta el gasto o reduce impuestos; la contraccionista hace lo contrario",
        "La expansionista reduce la deuda pública; la contraccionista la aumenta",
        "La expansionista solo se aplica en períodos de guerra",
        "La contraccionista siempre es perjudicial para el crecimiento económico",
      ],
      answerIndex: 0,
      explanation: "La política fiscal expansionista estimula la demanda en recesiones; la contraccionista enfría la economía en períodos de sobrecalentamiento.",
    },
  },

  critical_thinking: {
    pt: {
      question: "O que historicamente tende a acontecer quando o equilíbrio de poder é rompido?",
      options: [
        "Grandes conflitos e guerras tendem a surgir",
        "Os países mais fracos automaticamente se rendem",
        "Organismos internacionais assumem o controle",
        "A economia global colapsa imediatamente",
      ],
      answerIndex: 0,
      explanation: "A história mostra que quando uma potência rompe o equilíbrio — como Napoleão ou Hitler — coalizões se formam para restaurá-lo, frequentemente por meio de guerras.",
    },
    en: {
      question: "What historically tends to happen when the balance of power is broken?",
      options: [
        "Major conflicts and wars tend to emerge",
        "Weaker countries automatically surrender",
        "International organizations take control",
        "The global economy collapses immediately",
      ],
      answerIndex: 0,
      explanation: "History shows that when a power breaks the balance — like Napoleon or Hitler — coalitions form to restore it, frequently through wars.",
    },
    es: {
      question: "¿Qué tiende a ocurrir históricamente cuando se rompe el equilibrio de poder?",
      options: [
        "Tienden a surgir grandes conflictos y guerras",
        "Los países más débiles se rinden automáticamente",
        "Los organismos internacionales asumen el control",
        "La economía global colapsa de inmediato",
      ],
      answerIndex: 0,
      explanation: "La historia muestra que cuando una potencia rompe el equilibrio —como Napoleón o Hitler— se forman coaliciones para restaurarlo, frecuentemente mediante guerras.",
    },
  },

  critical_thinking_fallacies: {
    pt: {
      question: "O que é a falácia da ladeira escorregadia?",
      options: [
        "Afirmar que uma ação levará inevitavelmente a consequências extremas, sem evidências",
        "Atacar o caráter de uma pessoa em vez de seu argumento",
        "Usar linguagem vaga para evitar contrariar alguém",
        "Afirmar que algo é verdade porque sempre foi assim",
      ],
      answerIndex: 0,
      explanation: "A ladeira escorregadia assume uma cadeia inevitável de causas sem demonstrar por que cada passo necessariamente leva ao seguinte.",
    },
    en: {
      question: "What is the slippery slope fallacy?",
      options: [
        "Claiming that an action will inevitably lead to extreme consequences without evidence",
        "Attacking a person's character instead of their argument",
        "Using vague language to avoid contradicting someone",
        "Claiming something is true because it has always been that way",
      ],
      answerIndex: 0,
      explanation: "The slippery slope assumes an inevitable chain of causes without demonstrating why each step necessarily leads to the next.",
    },
    es: {
      question: "¿Qué es la falacia de la pendiente resbaladiza?",
      options: [
        "Afirmar que una acción llevará inevitablemente a consecuencias extremas sin evidencias",
        "Atacar el carácter de una persona en lugar de su argumento",
        "Usar lenguaje vago para evitar contradecir a alguien",
        "Afirmar que algo es verdad porque siempre ha sido así",
      ],
      answerIndex: 0,
      explanation: "La pendiente resbaladiza asume una cadena inevitable de causas sin demostrar por qué cada paso lleva necesariamente al siguiente.",
    },
  },

  critical_thinking_bias: {
    pt: {
      question: "O que distingue vieses cognitivos de simples erros de raciocínio?",
      options: [
        "Vieses são padrões sistemáticos e previsíveis; erros são aleatórios",
        "Vieses afetam apenas pessoas não educadas",
        "Erros são intencionais; vieses são sempre acidentais",
        "Vieses desaparecem com experiência profissional suficiente",
      ],
      answerIndex: 0,
      explanation: "Vieses cognitivos são distorções sistemáticas que afetam toda a espécie humana de forma previsível, independente de inteligência ou educação.",
    },
    en: {
      question: "What distinguishes cognitive biases from simple reasoning errors?",
      options: [
        "Biases are systematic and predictable patterns; errors are random",
        "Biases only affect uneducated people",
        "Errors are intentional; biases are always accidental",
        "Biases disappear with sufficient professional experience",
      ],
      answerIndex: 0,
      explanation: "Cognitive biases are systematic distortions that affect the entire human species in a predictable way, regardless of intelligence or education.",
    },
    es: {
      question: "¿Qué distingue los sesgos cognitivos de los simples errores de razonamiento?",
      options: [
        "Los sesgos son patrones sistemáticos y predecibles; los errores son aleatorios",
        "Los sesgos solo afectan a personas sin educación",
        "Los errores son intencionales; los sesgos siempre son accidentales",
        "Los sesgos desaparecen con suficiente experiencia profesional",
      ],
      answerIndex: 0,
      explanation: "Los sesgos cognitivos son distorsiones sistemáticas que afectan a toda la especie humana de manera predecible, independientemente de la inteligencia o la educación.",
    },
  },

  history: {
    pt: {
      question: "Por que estudar história ajuda a tomar melhores decisões no presente?",
      options: [
        "Porque padrões históricos revelam causas e consequências que tendem a se repetir",
        "Porque o passado sempre prediz o futuro com precisão",
        "Porque historiadores têm autoridade para definir políticas públicas",
        "Porque a história elimina a necessidade de análise do contexto atual",
      ],
      answerIndex: 0,
      explanation: "A história não se repete exatamente, mas seus padrões — ascensão e queda de impérios, crises econômicas, movimentos sociais — oferecem analogias valiosas para o presente.",
    },
    en: {
      question: "Why does studying history help make better decisions in the present?",
      options: [
        "Because historical patterns reveal causes and consequences that tend to repeat",
        "Because the past always predicts the future with precision",
        "Because historians have authority to define public policies",
        "Because history eliminates the need for current context analysis",
      ],
      answerIndex: 0,
      explanation: "History does not repeat exactly, but its patterns — rise and fall of empires, economic crises, social movements — offer valuable analogies for the present.",
    },
    es: {
      question: "¿Por qué estudiar historia ayuda a tomar mejores decisiones en el presente?",
      options: [
        "Porque los patrones históricos revelan causas y consecuencias que tienden a repetirse",
        "Porque el pasado siempre predice el futuro con precisión",
        "Porque los historiadores tienen autoridad para definir políticas públicas",
        "Porque la historia elimina la necesidad de analizar el contexto actual",
      ],
      answerIndex: 0,
      explanation: "La historia no se repite exactamente, pero sus patrones —ascenso y caída de imperios, crisis económicas, movimientos sociales— ofrecen valiosas analogías para el presente.",
    },
  },

  history_wwii: {
    pt: {
      question: "Qual evento levou os EUA a entrarem oficialmente na Segunda Guerra Mundial?",
      options: [
        "O ataque japonês à base naval americana de Pearl Harbor em dezembro de 1941",
        "A invasão alemã da Polônia em 1939",
        "O bombardeio de Londres pela Luftwaffe em 1940",
        "A queda de Paris para as forças nazistas em 1940",
      ],
      answerIndex: 0,
      explanation: "Antes de Pearl Harbor, os EUA mantinham neutralidade oficial. O ataque de 7 de dezembro de 1941 provocou a declaração de guerra ao Japão no dia seguinte.",
    },
    en: {
      question: "What event led the US to officially enter World War II?",
      options: [
        "The Japanese attack on the US naval base at Pearl Harbor in December 1941",
        "The German invasion of Poland in 1939",
        "The Luftwaffe's bombing of London in 1940",
        "The fall of Paris to Nazi forces in 1940",
      ],
      answerIndex: 0,
      explanation: "Before Pearl Harbor, the US maintained official neutrality. The attack on December 7, 1941 prompted the declaration of war on Japan the following day.",
    },
    es: {
      question: "¿Qué evento llevó a EE.UU. a entrar oficialmente en la Segunda Guerra Mundial?",
      options: [
        "El ataque japonés a la base naval estadounidense de Pearl Harbor en diciembre de 1941",
        "La invasión alemana de Polonia en 1939",
        "El bombardeo de Londres por la Luftwaffe en 1940",
        "La caída de París ante las fuerzas nazis en 1940",
      ],
      answerIndex: 0,
      explanation: "Antes de Pearl Harbor, EE.UU. mantenía neutralidad oficial. El ataque del 7 de diciembre de 1941 provocó la declaración de guerra a Japón al día siguiente.",
    },
  },

  history_cold_war: {
    pt: {
      question: "O que foi a 'corrida espacial' e qual foi seu significado geopolítico?",
      options: [
        "Uma disputa tecnológica EUA-URSS para demonstrar superioridade — culminou na chegada à Lua",
        "Uma competição econômica para dominar o mercado de satélites comerciais",
        "Um programa conjunto para explorar Marte durante a détente",
        "Uma corrida armamentista para desenvolver mísseis balísticos intercontinentais",
      ],
      answerIndex: 0,
      explanation: "A corrida espacial foi uma batalha de prestígio e capacidade tecnológica. A chegada dos EUA à Lua em 1969 foi um golpe simbólico decisivo.",
    },
    en: {
      question: "What was the 'space race' and what was its geopolitical significance?",
      options: [
        "A US-USSR technological competition to demonstrate superiority — culminating in the Moon landing",
        "An economic competition to dominate the commercial satellite market",
        "A joint program to explore Mars during détente",
        "An arms race to develop intercontinental ballistic missiles",
      ],
      answerIndex: 0,
      explanation: "The space race was a battle of prestige and technological capability. The US Moon landing in 1969 was a decisive symbolic blow.",
    },
    es: {
      question: "¿Qué fue la 'carrera espacial' y cuál fue su significado geopolítico?",
      options: [
        "Una competencia tecnológica EE.UU.-URSS para demostrar superioridad — culminó en el alunizaje",
        "Una competencia económica para dominar el mercado de satélites comerciales",
        "Un programa conjunto para explorar Marte durante la distensión",
        "Una carrera armamentista para desarrollar misiles balísticos intercontinentales",
      ],
      answerIndex: 0,
      explanation: "La carrera espacial fue una batalla de prestigio y capacidad tecnológica. El alunizaje de EE.UU. en 1969 fue un golpe simbólico decisivo.",
    },
  },

  history_colonialism: {
    pt: {
      question: "Como o colonialismo europeu impactou as fronteiras dos países africanos?",
      options: [
        "Fronteiras foram traçadas artificialmente, ignorando divisões étnicas, linguísticas e culturais",
        "Respeitaram as fronteiras de reinos e impérios pré-coloniais",
        "Foram definidas pelos próprios povos africanos em conferências regionais",
        "Seguiram barreiras geográficas naturais como rios e montanhas",
      ],
      answerIndex: 0,
      explanation: "A Conferência de Berlim (1884–85) dividiu a África entre potências europeias sem levar em conta povos e culturas, criando tensões que persistem hoje.",
    },
    en: {
      question: "How did European colonialism impact African country borders?",
      options: [
        "Borders were drawn artificially, ignoring ethnic, linguistic, and cultural divisions",
        "They respected the borders of pre-colonial kingdoms and empires",
        "They were defined by African peoples themselves at regional conferences",
        "They followed natural geographic barriers like rivers and mountains",
      ],
      answerIndex: 0,
      explanation: "The Berlin Conference (1884–85) divided Africa among European powers without considering peoples and cultures, creating tensions that persist today.",
    },
    es: {
      question: "¿Cómo impactó el colonialismo europeo en las fronteras de los países africanos?",
      options: [
        "Las fronteras se trazaron artificialmente, ignorando divisiones étnicas, lingüísticas y culturales",
        "Respetaron las fronteras de reinos e imperios precoloniales",
        "Fueron definidas por los propios pueblos africanos en conferencias regionales",
        "Siguieron barreras geográficas naturales como ríos y montañas",
      ],
      answerIndex: 0,
      explanation: "La Conferencia de Berlín (1884–85) dividió África entre potencias europeas sin considerar pueblos y culturas, creando tensiones que persisten hoy.",
    },
  },

  history_industrial_revolution: {
    pt: {
      question: "Por que a Revolução Industrial começou na Inglaterra e não em outro país europeu?",
      options: [
        "A Inglaterra tinha carvão, capital financeiro, colônias e uma classe mercantil forte",
        "Por ter recebido mais imigrantes qualificados do que outros países",
        "Por ser o único país com acesso ao oceano Atlântico",
        "Porque o governo inglês proibiu o trabalho manual, forçando a automação",
      ],
      answerIndex: 0,
      explanation: "A combinação de recursos naturais (carvão e ferro), capital acumulado pelo comércio colonial, proteção de patentes e uma burguesia empreendedora fez da Inglaterra o berço da industrialização.",
    },
    en: {
      question: "Why did the Industrial Revolution begin in England rather than another European country?",
      options: [
        "England had coal, financial capital, colonies, and a strong merchant class",
        "Because it received more skilled immigrants than other countries",
        "Because it was the only country with access to the Atlantic Ocean",
        "Because the English government banned manual labor, forcing automation",
      ],
      answerIndex: 0,
      explanation: "The combination of natural resources (coal and iron), capital accumulated through colonial trade, patent protection, and an entrepreneurial bourgeoisie made England the birthplace of industrialization.",
    },
    es: {
      question: "¿Por qué la Revolución Industrial comenzó en Inglaterra y no en otro país europeo?",
      options: [
        "Inglaterra tenía carbón, capital financiero, colonias y una fuerte clase mercantil",
        "Porque recibió más inmigrantes calificados que otros países",
        "Porque era el único país con acceso al océano Atlántico",
        "Porque el gobierno inglés prohibió el trabajo manual, forzando la automatización",
      ],
      answerIndex: 0,
      explanation: "La combinación de recursos naturales (carbón y hierro), capital acumulado por el comercio colonial, protección de patentes y una burguesía emprendedora hizo de Inglaterra la cuna de la industrialización.",
    },
  },

  psychology: {
    pt: {
      question: "O que são heurísticas cognitivas?",
      options: [
        "Atalhos mentais que agilizam decisões, mas podem gerar erros sistemáticos",
        "Técnicas de memorização usadas por especialistas",
        "Métodos científicos para medir a inteligência",
        "Estratégias conscientes de resolução de problemas",
      ],
      answerIndex: 0,
      explanation: "Heurísticas são 'regras de bolso' que o cérebro usa para decidir rapidamente. Úteis na maioria das situações, mas podem criar vieses em contextos complexos.",
    },
    en: {
      question: "What are cognitive heuristics?",
      options: [
        "Mental shortcuts that speed up decisions but can generate systematic errors",
        "Memorization techniques used by experts",
        "Scientific methods for measuring intelligence",
        "Conscious problem-solving strategies",
      ],
      answerIndex: 0,
      explanation: "Heuristics are 'rules of thumb' the brain uses to decide quickly. Useful in most situations, but they can create biases in complex contexts.",
    },
    es: {
      question: "¿Qué son las heurísticas cognitivas?",
      options: [
        "Atajos mentales que agilizan las decisiones pero pueden generar errores sistemáticos",
        "Técnicas de memorización usadas por expertos",
        "Métodos científicos para medir la inteligencia",
        "Estrategias conscientes de resolución de problemas",
      ],
      answerIndex: 0,
      explanation: "Las heurísticas son 'reglas generales' que el cerebro usa para decidir rápidamente. Útiles en la mayoría de las situaciones, pero pueden crear sesgos en contextos complejos.",
    },
  },

  psychology_emotions: {
    pt: {
      question: "O que o neurocientista António Damásio descobriu sobre a relação entre emoções e razão?",
      options: [
        "Que emoções são essenciais para tomar boas decisões, não apenas obstáculos à razão",
        "Que a razão e as emoções funcionam de forma completamente independente",
        "Que emoções só influenciam decisões em crianças, não em adultos",
        "Que decisões racionais são sempre superiores às emocionais",
      ],
      answerIndex: 0,
      explanation: "Damásio estudou pacientes com lesões no córtex pré-frontal ventromedial e descobriu que, sem emoções, eles não conseguiam tomar decisões práticas eficazes.",
    },
    en: {
      question: "What did neuroscientist António Damásio discover about the relationship between emotions and reason?",
      options: [
        "That emotions are essential for making good decisions, not just obstacles to reason",
        "That reason and emotions function completely independently",
        "That emotions only influence decisions in children, not adults",
        "That rational decisions are always superior to emotional ones",
      ],
      answerIndex: 0,
      explanation: "Damásio studied patients with lesions in the ventromedial prefrontal cortex and found that without emotions, they could not make effective practical decisions.",
    },
    es: {
      question: "¿Qué descubrió el neurocientífico António Damásio sobre la relación entre emociones y razón?",
      options: [
        "Que las emociones son esenciales para tomar buenas decisiones, no meros obstáculos a la razón",
        "Que la razón y las emociones funcionan de forma completamente independiente",
        "Que las emociones solo influyen en las decisiones de los niños, no de los adultos",
        "Que las decisiones racionales son siempre superiores a las emocionales",
      ],
      answerIndex: 0,
      explanation: "Damásio estudió pacientes con lesiones en el córtex prefrontal ventromedial y descubrió que sin emociones no podían tomar decisiones prácticas eficaces.",
    },
  },

  psychology_habits: {
    pt: {
      question: "Quais são os três componentes do 'loop do hábito' segundo Charles Duhigg?",
      options: [
        "Gatilho, rotina e recompensa",
        "Intenção, ação e resultado",
        "Motivação, esforço e prática",
        "Estímulo, resposta e punição",
      ],
      answerIndex: 0,
      explanation: "O loop do hábito começa com um gatilho (situação ou estímulo), segue por uma rotina (comportamento automático) e termina com uma recompensa que reforça o ciclo.",
    },
    en: {
      question: "What are the three components of the 'habit loop' according to Charles Duhigg?",
      options: [
        "Cue, routine, and reward",
        "Intention, action, and result",
        "Motivation, effort, and practice",
        "Stimulus, response, and punishment",
      ],
      answerIndex: 0,
      explanation: "The habit loop starts with a cue (situation or stimulus), follows with a routine (automatic behavior), and ends with a reward that reinforces the cycle.",
    },
    es: {
      question: "¿Cuáles son los tres componentes del 'bucle del hábito' según Charles Duhigg?",
      options: [
        "Señal, rutina y recompensa",
        "Intención, acción y resultado",
        "Motivación, esfuerzo y práctica",
        "Estímulo, respuesta y castigo",
      ],
      answerIndex: 0,
      explanation: "El bucle del hábito comienza con una señal (situación o estímulo), continúa con una rutina (comportamiento automático) y termina con una recompensa que refuerza el ciclo.",
    },
  },

  psychology_social: {
    pt: {
      question: "O que o experimento de Solomon Asch sobre conformidade demonstrou?",
      options: [
        "Que pessoas tendem a adotar a opinião do grupo mesmo quando claramente errada",
        "Que a conformidade social desaparece em grupos menores",
        "Que apenas crianças são influenciadas pela pressão dos pares",
        "Que a maioria das pessoas resiste à pressão social em situações óbvias",
      ],
      answerIndex: 0,
      explanation: "No experimento de Asch, 75% dos participantes cederam à pressão do grupo ao menos uma vez, mesmo quando a resposta correta era visualmente óbvia.",
    },
    en: {
      question: "What did Solomon Asch's conformity experiment demonstrate?",
      options: [
        "That people tend to adopt the group's opinion even when it is clearly wrong",
        "That social conformity disappears in smaller groups",
        "That only children are influenced by peer pressure",
        "That most people resist social pressure in obvious situations",
      ],
      answerIndex: 0,
      explanation: "In Asch's experiment, 75% of participants yielded to group pressure at least once, even when the correct answer was visually obvious.",
    },
    es: {
      question: "¿Qué demostró el experimento de conformidad de Solomon Asch?",
      options: [
        "Que las personas tienden a adoptar la opinión del grupo incluso cuando está claramente equivocada",
        "Que la conformidad social desaparece en grupos más pequeños",
        "Que solo los niños son influenciados por la presión de grupo",
        "Que la mayoría de las personas resiste la presión social en situaciones obvias",
      ],
      answerIndex: 0,
      explanation: "En el experimento de Asch, el 75% de los participantes cedió a la presión del grupo al menos una vez, incluso cuando la respuesta correcta era visualmente obvia.",
    },
  },

  psychology_resilience: {
    pt: {
      question: "O que diferencia resiliência de simplesmente 'aguentar firme'?",
      options: [
        "Resiliência envolve adaptação ativa e crescimento; 'aguentar' é suportação passiva",
        "Resiliência é uma característica genética imutável",
        "Resiliência significa nunca demonstrar vulnerabilidade",
        "Aguentar firme é sempre mais eficaz do que ser resiliente",
      ],
      answerIndex: 0,
      explanation: "Resiliência não é apenas suportar adversidades — é se reorganizar, aprender com elas e emergir com maior capacidade de enfrentar desafios futuros.",
    },
    en: {
      question: "What distinguishes resilience from simply 'enduring'?",
      options: [
        "Resilience involves active adaptation and growth; 'enduring' is passive tolerance",
        "Resilience is an immutable genetic characteristic",
        "Resilience means never showing vulnerability",
        "Enduring is always more effective than being resilient",
      ],
      answerIndex: 0,
      explanation: "Resilience is not just tolerating adversity — it is reorganizing, learning from it, and emerging with a greater capacity to face future challenges.",
    },
    es: {
      question: "¿Qué distingue la resiliencia de simplemente 'aguantar'?",
      options: [
        "La resiliencia implica adaptación activa y crecimiento; 'aguantar' es tolerancia pasiva",
        "La resiliencia es una característica genética inmutable",
        "La resiliencia significa nunca mostrar vulnerabilidad",
        "Aguantar siempre es más eficaz que ser resiliente",
      ],
      answerIndex: 0,
      explanation: "La resiliencia no es solo tolerar la adversidad — es reorganizarse, aprender de ella y emerger con mayor capacidad para enfrentar desafíos futuros.",
    },
  },
};

// ---------------------------------------------------------------------------
// Download + patch + upload
// ---------------------------------------------------------------------------

const LANGS = ["pt", "en", "es"];

async function downloadPack(id, version, lang) {
  const storagePath = `packs/${id}/v${version}/${lang}.json`;
  const file = bucket.file(storagePath);
  const [contents] = await file.download();
  return JSON.parse(contents.toString("utf8"));
}

async function uploadPack(pack, id, version, lang) {
  const storagePath = `packs/${id}/v${version}/${lang}.json`;
  const file = bucket.file(storagePath);
  await file.save(JSON.stringify(pack, null, 2), {
    contentType: "application/json",
    metadata: { cacheControl: "public, max-age=86400" },
  });
  console.log(`  ✓ uploaded ${storagePath}`);
}

async function patchPack(id) {
  const q3data = Q3[id];
  if (!q3data) {
    console.log(`  ⚠ No Q3 defined for ${id} — skipping`);
    return;
  }

  for (const lang of LANGS) {
    const q3 = q3data[lang];
    if (!q3) { console.log(`  ⚠ No Q3[${lang}] for ${id}`); continue; }

    let pack;
    try {
      pack = await downloadPack(id, 1, lang);
    } catch (e) {
      console.error(`  ✗ Could not download ${id}/v1/${lang}.json: ${e.message}`);
      continue;
    }

    // Add 3rd question if not already present
    const alreadyHas3 = pack.quiz && pack.quiz.length >= 3;
    if (alreadyHas3) {
      console.log(`  — ${id}/${lang}: already has ${pack.quiz.length} questions, uploading as v2 anyway`);
    }

    const updatedQuiz = alreadyHas3
      ? pack.quiz
      : [...(pack.quiz ?? []), { id: "q3", ...q3 }];

    const updatedPack = { ...pack, version: 2, quiz: updatedQuiz };
    await uploadPack(updatedPack, id, 2, lang);
  }
}

async function main() {
  const packIds = Object.keys(Q3);
  console.log(`Patching ${packIds.length} packs → v2 with 3 quiz questions\n`);

  for (const id of packIds) {
    console.log(`[${id}]`);
    await patchPack(id);
  }

  console.log("\nDone! Remember to bump version: 1 → 2 in lessons.repo.ts for these packs.");
}

main().catch((err) => {
  console.error("\nFatal:", err.message);
  process.exit(1);
});
