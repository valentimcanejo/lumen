/**
 * generate-premium-packs.js
 * Generates 80 premium packs (10 tracks × 8 lessons, orders 11–18).
 * Uses Claude Sonnet for lesson generation and Haiku for translation.
 *
 * Usage:
 *   ANTHROPIC_API_KEY=sk-ant-... node scripts/generate-premium-packs.js
 *   ANTHROPIC_API_KEY=sk-ant-... node scripts/generate-premium-packs.js --track foundations
 *   ANTHROPIC_API_KEY=sk-ant-... node scripts/generate-premium-packs.js --id foundations_game_theory
 *   ANTHROPIC_API_KEY=sk-ant-... node scripts/generate-premium-packs.js --dry-run
 */

const admin = require("firebase-admin");
const Anthropic = require("@anthropic-ai/sdk");
const path = require("path");
const fs = require("fs");

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

// ─── PREMIUM PACK DEFINITIONS ─────────────────────────────────────────────────

const PREMIUM_PACKS = [
  // ── foundations (11–18) ─────────────────────────────────────────────────────
  { id: "foundations_game_theory", trackId: "foundations", order: 11, difficulty: 3,
    title: { pt: "Teoria dos Jogos", en: "Game Theory", es: "Teoría de Juegos" },
    topic: "Teoria dos Jogos: dilema do prisioneiro, equilíbrio de Nash, jogos de soma zero e soma positiva, cooperação e defecção, exemplos em política, negócios e biologia evolutiva" },
  { id: "foundations_epistemology", trackId: "foundations", order: 12, difficulty: 3,
    title: { pt: "Como Sabemos o que Sabemos", en: "How We Know What We Know", es: "Cómo Sabemos lo que Sabemos" },
    topic: "Epistemologia aplicada: tipos de conhecimento, fontes confiáveis vs. não confiáveis, ceticismo prático, Dunning-Kruger, a diferença entre crença e conhecimento justificado" },
  { id: "foundations_risk", trackId: "foundations", order: 13, difficulty: 3,
    title: { pt: "Pensando em Riscos", en: "Thinking About Risk", es: "Pensando en Riesgos" },
    topic: "Gestão de riscos pessoal e organizacional: probabilidade vs. impacto, cauda gorda, risco de ruína, barbell strategy, diferença entre risco e incerteza, como tomar decisões em contextos de alta incerteza" },
  { id: "foundations_narrative", trackId: "foundations", order: 14, difficulty: 2,
    title: { pt: "O Poder das Narrativas", en: "The Power of Narratives", es: "El Poder de las Narrativas" },
    topic: "Como narrativas moldam percepções, decisões e movimentos sociais: estrutura narrativa, viés de confirmação reforçado por histórias, narrativas nacionais, propaganda, como detectar e construir narrativas eficazes" },
  { id: "foundations_abstraction", trackId: "foundations", order: 15, difficulty: 3,
    title: { pt: "A Arte da Abstração", en: "The Art of Abstraction", es: "El Arte de la Abstracción" },
    topic: "Abstração como ferramenta de pensamento: mapas vs. território, modelos mentais como simplificações úteis, quando abstrações ajudam e quando enganam, o problema da generalização excessiva, exemplos em ciência, matemática e negócios" },
  { id: "foundations_feedback", trackId: "foundations", order: 16, difficulty: 3,
    title: { pt: "Loops de Feedback", en: "Feedback Loops", es: "Bucles de Retroalimentación" },
    topic: "Feedback positivo e negativo em sistemas: como loops de feedback moldam economias, redes sociais, ecossistemas e comportamento humano; aceleração exponencial, ciclos viciosos e virtuosos, como identificar e intervir em loops" },
  { id: "foundations_cognitive_tools", trackId: "foundations", order: 17, difficulty: 3,
    title: { pt: "Ferramentas Cognitivas Avançadas", en: "Advanced Cognitive Tools", es: "Herramientas Cognitivas Avanzadas" },
    topic: "Ferramentas mentais avançadas: pensamento contrafactual, raciocínio por analogia, inversão de problemas, steelmanning (o melhor argumento do oponente), cadeia de causa e efeito, como combinar múltiplas ferramentas" },
  { id: "foundations_meta_learning", trackId: "foundations", order: 18, difficulty: 2,
    title: { pt: "Como Aprender a Aprender", en: "How to Learn How to Learn", es: "Cómo Aprender a Aprender" },
    topic: "A ciência do aprendizado eficaz: espaçamento, prática de recuperação, intercalação, elaboração, efeito de geração, ilusões de competência, aprendizado ativo vs. passivo, como estruturar o estudo para retenção de longo prazo" },

  // ── geopolitics (11–18) ──────────────────────────────────────────────────────
  { id: "geopolitics_india", trackId: "geopolitics", order: 11, difficulty: 3,
    title: { pt: "India: A Terceira Superpotência", en: "India: The Third Superpower", es: "India: La Tercera Superpotencia" },
    topic: "A ascensão geopolítica da Índia: população, crescimento econômico, posição estratégica entre China e Ocidente, ambiguidade estratégica, relação com EUA/Rússia/China, programa nuclear, papel global emergente" },
  { id: "geopolitics_southeast_asia", trackId: "geopolitics", order: 12, difficulty: 3,
    title: { pt: "Sudeste Asiático: O Novo Centro", en: "Southeast Asia: The New Center", es: "Sudeste Asiático: El Nuevo Centro" },
    topic: "O Sudeste Asiático como região-chave do século XXI: ASEAN, tensões no Mar do Sul da China, rivalidade EUA-China na região, cadeias de suprimento globais, Vietnam, Indonésia, Tailândia, Singapura como hubs" },
  { id: "geopolitics_energy", trackId: "geopolitics", order: 13, difficulty: 3,
    title: { pt: "A Geopolítica da Energia", en: "The Geopolitics of Energy", es: "La Geopolítica de la Energía" },
    topic: "Transição energética e geopolítica: quem controla os minerais críticos (lítio, cobalto, terras raras), como países petrolíferos se adaptam, o papel da China na energia solar/eólica, novos conflitos de recursos" },
  { id: "geopolitics_cyber", trackId: "geopolitics", order: 14, difficulty: 3,
    title: { pt: "Guerra Cibernética", en: "Cyber Warfare", es: "Guerra Cibernética" },
    topic: "Guerra cibernética moderna: ataques de estado, espionagem digital, desinformação como arma, vulnerabilidades de infraestrutura crítica, os casos Stuxnet, SolarWinds e ataques à Ucrânia, deterrência no espaço cibernético" },
  { id: "geopolitics_trade_wars", trackId: "geopolitics", order: 15, difficulty: 3,
    title: { pt: "Guerras Comerciais", en: "Trade Wars", es: "Guerras Comerciales" },
    topic: "Guerras comerciais do século XXI: tarifas como armas geopolíticas, guerra comercial EUA-China, nearshoring e reshoring, fragmentação das cadeias de suprimento globais, quem ganha e quem perde" },
  { id: "geopolitics_migration", trackId: "geopolitics", order: 16, difficulty: 2,
    title: { pt: "Migração e Geopolítica", en: "Migration and Geopolitics", es: "Migración y Geopolítica" },
    topic: "Migração como força geopolítica: causas (guerras, clima, economia), impacto nos países receptores, populismo anti-imigração, crise de refugiados, fuga de cérebros vs. ganho de cérebros, acordos internacionais de migração" },
  { id: "geopolitics_multilateralism", trackId: "geopolitics", order: 17, difficulty: 3,
    title: { pt: "O Futuro do Multilateralismo", en: "The Future of Multilateralism", es: "El Futuro del Multilateralismo" },
    topic: "Crise do multilateralismo: enfraquecimento da ONU, OMC e FMI, ascensão de blocos regionais (BRICS, G7, SCO), fragmentação da ordem global, can multilateral institutions be reformed? O que vem depois?" },
  { id: "geopolitics_latin_america", trackId: "geopolitics", order: 18, difficulty: 2,
    title: { pt: "América Latina no Tabuleiro Global", en: "Latin America on the Global Board", es: "América Latina en el Tablero Global" },
    topic: "A América Latina na geopolítica global: recursos naturais estratégicos (lítio no triângulo do lítio, amazônia), influência da China na região, relação com EUA, instabilidade política e democracia, o papel do Brasil como liderança regional" },

  // ── economics (11–18) ────────────────────────────────────────────────────────
  { id: "economics_crypto", trackId: "economics", order: 11, difficulty: 3,
    title: { pt: "Criptomoedas e o Futuro do Dinheiro", en: "Crypto and the Future of Money", es: "Cripto y el Futuro del Dinero" },
    topic: "Bitcoin, blockchain e o futuro do dinheiro: o que são, como funcionam, CBDCs (moedas digitais de bancos centrais), riscos e promessas, o debate regulatório, DeFi, NFTs — o que sobrevive e o que é especulação" },
  { id: "economics_automation", trackId: "economics", order: 12, difficulty: 3,
    title: { pt: "Automação e o Futuro do Trabalho", en: "Automation and the Future of Work", es: "Automatización y el Futuro del Trabajo" },
    topic: "IA e automação no mercado de trabalho: quais empregos serão afetados, história das previsões de desemprego tecnológico (e por que erraram), UBI, requalificação profissional, polarização do mercado de trabalho" },
  { id: "economics_degrowth", trackId: "economics", order: 13, difficulty: 3,
    title: { pt: "Além do PIB: Repensando Prosperidade", en: "Beyond GDP: Rethinking Prosperity", es: "Más Allá del PIB: Repensando la Prosperidad" },
    topic: "Críticas ao PIB como medida de prosperidade: economia do bem-estar, índices alternativos (IDH, BNB), economia circular, decrescimento como corrente de pensamento, o debate entre crescimento e sustentabilidade" },
  { id: "economics_housing", trackId: "economics", order: 14, difficulty: 2,
    title: { pt: "A Crise do Mercado Imobiliário", en: "The Housing Market Crisis", es: "La Crisis del Mercado Inmobiliario" },
    topic: "A crise habitacional global: por que imóveis ficaram tão caros, papel de fundos de investimento, zoneamento, NIMBYismo, impacto nos jovens, soluções adotadas ao redor do mundo, Viena como modelo" },
  { id: "economics_monopoly", trackId: "economics", order: 15, difficulty: 3,
    title: { pt: "Monopólios e o Poder das Plataformas", en: "Monopolies and Platform Power", es: "Monopolios y el Poder de las Plataformas" },
    topic: "Concentração de mercado no século XXI: Big Tech como monopólios de novo tipo, efeitos de rede, antitruste moderno, o problema da Amazon/Google/Meta, como plataformas capturam mercados, debate regulatório global" },
  { id: "economics_development", trackId: "economics", order: 16, difficulty: 3,
    title: { pt: "Economias em Desenvolvimento", en: "Developing Economies", es: "Economías en Desarrollo" },
    topic: "Por que alguns países crescem e outros não: armadilha da renda média, instituições e crescimento (Acemoglu), papel do comércio, ajuda externa — funciona?, casos de sucesso (Coreia do Sul, Taiwan, Bangladesh), caminhos para o desenvolvimento" },
  { id: "economics_climate_econ", trackId: "economics", order: 17, difficulty: 3,
    title: { pt: "Economia das Mudanças Climáticas", en: "The Economics of Climate Change", es: "La Economía del Cambio Climático" },
    topic: "Custo econômico das mudanças climáticas: Relatório Stern, precificação do carbono (impostos vs. mercados de carbono), economias de transição, who pays for the green transition, impacto em países em desenvolvimento" },
  { id: "economics_healthcare", trackId: "economics", order: 18, difficulty: 2,
    title: { pt: "Economia da Saúde", en: "Health Economics", es: "Economía de la Salud" },
    topic: "Por que saúde é tão cara: falhas de mercado em saúde (informação assimétrica, externalities, poder de monopsônio), sistemas comparados (EUA vs. Europa vs. Ásia), pandemias e custo econômico, precificação de medicamentos" },

  // ── critical_thinking (11–18) ────────────────────────────────────────────────
  { id: "critical_thinking_persuasion", trackId: "critical_thinking", order: 11, difficulty: 2,
    title: { pt: "A Ciência da Persuasão", en: "The Science of Persuasion", es: "La Ciencia de la Persuasión" },
    topic: "Cialdini e os 6 princípios da influência: reciprocidade, comprometimento, prova social, autoridade, afeição, escassez. Aplicações éticas e manipulativas, como se defender, dark patterns em UX, propaganda moderna" },
  { id: "critical_thinking_disinformation", trackId: "critical_thinking", order: 12, difficulty: 3,
    title: { pt: "Desinformação e Verificação de Fatos", en: "Disinformation and Fact-Checking", es: "Desinformación y Verificación de Hechos" },
    topic: "O ecossistema da desinformação: fake news, deepfakes, câmaras de eco, como a desinformação se espalha, técnicas de verificação (SIFT, lateral reading), quem financia desinformação e por quê, o papel das plataformas" },
  { id: "critical_thinking_ai_era", trackId: "critical_thinking", order: 13, difficulty: 3,
    title: { pt: "Pensamento Crítico na Era da IA", en: "Critical Thinking in the AI Era", es: "Pensamiento Crítico en la Era de la IA" },
    topic: "Como a IA muda o que precisa ser um habilidade humana: alucinações de LLMs, como verificar outputs de IA, o risco de deleção de pensamento crítico, o que IA faz bem vs. mal, como colaborar com IA sem perder autonomia intelectual" },
  { id: "critical_thinking_statistics", trackId: "critical_thinking", order: 14, difficulty: 3,
    title: { pt: "Estatística para Não Matemáticos", en: "Statistics for Non-Mathematicians", es: "Estadística para No Matemáticos" },
    topic: "Leitura crítica de dados e estatísticas: correlação vs. causalidade, p-hacking, tamanho amostral, viés de seleção, como gráficos mentem, o que significam médias, medianas e desvio padrão, como ler estudos científicos com ceticismo saudável" },
  { id: "critical_thinking_philosophy_sci", trackId: "critical_thinking", order: 15, difficulty: 3,
    title: { pt: "Filosofia da Ciência", en: "Philosophy of Science", es: "Filosofía de la Ciencia" },
    topic: "Como a ciência funciona: Popper e falsificabilidade, Kuhn e revoluções científicas, Lakatos e programas de pesquisa, o problema da indução, o que separa ciência de pseudociência, crise de replicação, como confiar na ciência sem idolatrar cientistas" },
  { id: "critical_thinking_consensus", trackId: "critical_thinking", order: 16, difficulty: 2,
    title: { pt: "Consenso, Divergência e Controvérsia", en: "Consensus, Dissent, and Controversy", es: "Consenso, Disenso y Controversia" },
    topic: "Como consenso científico e social se forma: o papel dos dissidentes produtivos, quando resistir ao consenso é correto, groupthink, Overton Window, como distinguir controvérsia legítima de falsa controvérsia fabricada" },
  { id: "critical_thinking_language", trackId: "critical_thinking", order: 17, difficulty: 3,
    title: { pt: "Linguagem e Pensamento", en: "Language and Thought", es: "Lenguaje y Pensamiento" },
    topic: "Como a linguagem molda o pensamento: hipótese Sapir-Whorf, efeito do framing, eufemismos políticos, Orwell e o newspeak, como a escolha de palavras influencia decisões, o poder de nomear e categorizar, linguagem e poder" },
  { id: "critical_thinking_uncertainty", trackId: "critical_thinking", order: 18, difficulty: 3,
    title: { pt: "Vivendo com Incerteza Radical", en: "Living with Radical Uncertainty", es: "Viviendo con Incertidumbre Radical" },
    topic: "Como agir racionalmente diante de incerteza profunda: a diferença entre risco calculável e incerteza verdadeira (Knight), cisnes negros (Nassim Taleb), via negativa (o que não fazer), humildade epistêmica como vantagem competitiva, calibração de confiança" },

  // ── history (11–18) ──────────────────────────────────────────────────────────
  { id: "history_ancient", trackId: "history", order: 11, difficulty: 2,
    title: { pt: "As Grandes Civilizações Antigas", en: "The Great Ancient Civilizations", es: "Las Grandes Civilizaciones Antiguas" },
    topic: "O legado das civilizações antigas (Mesopotâmia, Egito, Grécia, Roma, China, Índia): o que cada uma inventou ou desenvolveu, por que colapsaram, o que sobrevive até hoje em lei, política, ciência, filosofia e cultura" },
  { id: "history_silk_road", trackId: "history", order: 12, difficulty: 2,
    title: { pt: "A Rota da Seda", en: "The Silk Road", es: "La Ruta de la Seda" },
    topic: "A Rota da Seda como sistema de globalização pré-moderna: o que era comercializado além da seda, difusão de doenças (Peste Negra), de religiões, tecnologias e ideias, o papel mongol, por que decaiu, paralelos com a Nova Rota da Seda chinesa atual" },
  { id: "history_reformation", trackId: "history", order: 13, difficulty: 2,
    title: { pt: "A Reforma Protestante", en: "The Protestant Reformation", es: "La Reforma Protestante" },
    topic: "A Reforma Protestante como revolução histórica: Lutero e as 95 teses, o papel da imprensa, ruptura da autoridade religiosa, guerras de religião, como moldou o capitalismo (Weber), individualismo e leitura direta da Bíblia, legado político e cultural" },
  { id: "history_slavery_legacy", trackId: "history", order: 14, difficulty: 3,
    title: { pt: "Escravidão: História e Legado", en: "Slavery: History and Legacy", es: "Esclavitud: Historia y Legado" },
    topic: "História global da escravidão: escravidão antes do Atlântico, o tráfico transatlântico em números, economias construídas sobre trabalho escravo, as abolições, o legado estrutural no racismo contemporâneo, reparações — o debate atual" },
  { id: "history_revolutions_20c", trackId: "history", order: 15, difficulty: 3,
    title: { pt: "As Grandes Revoluções do Século XX", en: "The Great Revolutions of the 20th Century", es: "Las Grandes Revoluciones del Siglo XX" },
    topic: "Revoluções que mudaram o mundo: Revolução Russa, Revolução Chinesa, Revolução Iraniana, descolonização africana — o que as causou, o que prometeram, o que entregaram, padrões comuns em revoluções e por que frequentemente deram errado" },
  { id: "history_decolonization", trackId: "history", order: 16, difficulty: 3,
    title: { pt: "Descolonização", en: "Decolonization", es: "Descolonización" },
    topic: "O processo de descolonização da África e Ásia no pós-WWII: por que aconteceu quando aconteceu, diferentes modelos (negociado, violento, gradual), fronteiras artificiais e seus legados, neocolonialismo, o papel do não-alinhamento e a Conferência de Bandung" },
  { id: "history_globalization_hist", trackId: "history", order: 17, difficulty: 2,
    title: { pt: "A História da Globalização", en: "The History of Globalization", es: "La Historia de la Globalización" },
    topic: "Globalização tem séculos: ondas históricas (Rota da Seda, expansão europeia, revolução industrial, Bretton Woods, pós-Guerra Fria), quem ganhou e quem perdeu em cada onda, backlashes, o que a história sugere sobre o futuro da globalização" },
  { id: "history_lessons", trackId: "history", order: 18, difficulty: 3,
    title: { pt: "O que a História nos Ensina", en: "What History Teaches Us", es: "Lo que la Historia nos Enseña" },
    topic: "Como usar a história para pensar o presente: o problema da analogia histórica (quando funciona, quando falha), ciclos históricos (Turchin), a falácia do determinismo histórico, o que podemos e não podemos aprender do passado, história como ferramenta intelectual" },

  // ── psychology (11–18) ───────────────────────────────────────────────────────
  { id: "psychology_decision_bias", trackId: "psychology", order: 11, difficulty: 3,
    title: { pt: "Vieses de Decisão Avançados", en: "Advanced Decision Biases", es: "Sesgos de Decisión Avanzados" },
    topic: "Vieses cognitivos além dos básicos: efeito de enquadramento, aversão à perda, hiperbolic discounting, viés de status quo, IKEA effect, efeito de dotação, sunk cost, como esses vieses afetam decisões financeiras, políticas e de saúde" },
  { id: "psychology_group", trackId: "psychology", order: 12, difficulty: 3,
    title: { pt: "Psicologia dos Grupos", en: "Group Psychology", es: "Psicología de los Grupos" },
    topic: "Como grupos moldam o comportamento individual: conformidade (Asch), obediência (Milgram), pensamento grupal (groupthink), polarização de grupo, deindividuação, identidade social, viés endogrupo, como construir grupos eficazes e resistir à pressão irracional de grupo" },
  { id: "psychology_trauma", trackId: "psychology", order: 13, difficulty: 3,
    title: { pt: "Trauma e Crescimento", en: "Trauma and Growth", es: "Trauma y Crecimiento" },
    topic: "A ciência do trauma: o que é PTSD, como o trauma afeta o cérebro e o corpo, diferentes tipos de trauma (agudo, crônico, desenvolvimento), crescimento pós-traumático, o papel da narrativa e da terapia, resiliência — o que é e o que não é" },
  { id: "psychology_personality", trackId: "psychology", order: 14, difficulty: 2,
    title: { pt: "Personalidade: O que Somos", en: "Personality: Who We Are", es: "Personalidad: Quiénes Somos" },
    topic: "Ciência da personalidade: Big Five (OCEAN), críticas ao MBTI, hereditariedade vs. ambiente, personalidade muda ao longo da vida?, diferenças individuais em risco, socialidade e conscienciosidade, implicações para carreira e relacionamentos" },
  { id: "psychology_addiction", trackId: "psychology", order: 15, difficulty: 3,
    title: { pt: "Vício e Comportamento Compulsivo", en: "Addiction and Compulsive Behavior", es: "Adicción y Comportamiento Compulsivo" },
    topic: "A neurociência do vício: como a dopamina cria loops de recompensa, vício em substâncias vs. comportamental (redes sociais, jogos, pornografia), o ciclo vício-recompensa, abordagens de tratamento que funcionam, o debate dependência vs. escolha" },
  { id: "psychology_positive", trackId: "psychology", order: 16, difficulty: 2,
    title: { pt: "Psicologia Positiva", en: "Positive Psychology", es: "Psicología Positiva" },
    topic: "A ciência do bem-estar: o modelo PERMA (Seligman), o que realmente aumenta a felicidade (e o que não aumenta), hedonic adaptation, flow (Csikszentmihalyi), o papel dos relacionamentos, significado vs. prazer, críticas à psicologia positiva" },
  { id: "psychology_lifespan", trackId: "psychology", order: 17, difficulty: 2,
    title: { pt: "Desenvolvimento ao Longo da Vida", en: "Lifespan Development", es: "Desarrollo a lo Largo de la Vida" },
    topic: "Como humanos se desenvolvem da infância à velhice: estágios de Erikson, apego (Bowlby), adolescência e o cérebro, adultos jovens vs. meia-idade, crise da meia-vida, envelhecimento psicológico, o que muda e o que não muda ao longo da vida" },
  { id: "psychology_communication", trackId: "psychology", order: 18, difficulty: 2,
    title: { pt: "Psicologia da Comunicação", en: "The Psychology of Communication", es: "La Psicología de la Comunicación" },
    topic: "Como a comunicação realmente funciona: comunicação não-verbal (55/38/7), escuta ativa, a brecha entre intenção e recepção, diferenças de comunicação entre culturas e gêneros, conversas difíceis, feedback eficaz, como comunicar em contextos de alta pressão" },

  // ── philosophy (11–18) ──────────────────────────────────────────────────────
  { id: "philosophy_aesthetics", trackId: "philosophy", order: 11, difficulty: 2,
    title: { pt: "Estética: O que é Beleza?", en: "Aesthetics: What Is Beauty?", es: "Estética: ¿Qué es la Belleza?" },
    topic: "Filosofia da estética: a beleza é objetiva ou subjetiva?, Kant e o juízo estético, Hume e o gosto, por que algumas obras de arte duram milênios, a relação entre ética e estética, arte como experiência, arte como commodidade, o sublime" },
  { id: "philosophy_time", trackId: "philosophy", order: 12, difficulty: 3,
    title: { pt: "Filosofia do Tempo", en: "Philosophy of Time", es: "Filosofía del Tiempo" },
    topic: "O tempo é real? A-series vs. B-series, presentismo vs. eternalismo, o bloco do universo, tempo psicológico vs. tempo físico, a flecha do tempo (por que não lembramos do futuro?), relatividade e tempo, o que significa 'agora'" },
  { id: "philosophy_justice", trackId: "philosophy", order: 13, difficulty: 3,
    title: { pt: "Teorias da Justiça", en: "Theories of Justice", es: "Teorías de la Justicia" },
    topic: "As grandes teorias de justiça: Rawls (véu da ignorância, princípio da diferença), Nozick (libertarismo), utilitarismo, comunitarismo, justiça como equidade vs. justiça como mérito, o debate sobre ação afirmativa como caso prático" },
  { id: "philosophy_power", trackId: "philosophy", order: 14, difficulty: 3,
    title: { pt: "Filosofia do Poder", en: "Philosophy of Power", es: "Filosofía del Poder" },
    topic: "Pensadores do poder: Maquiavel, Hobbes, Foucault (poder disciplinar e biopoder), Gramsci (hegemonia), Hannah Arendt (poder vs. violência), como o poder opera de formas visíveis e invisíveis, resistência e subversão" },
  { id: "philosophy_language", trackId: "philosophy", order: 15, difficulty: 3,
    title: { pt: "Filosofia da Linguagem", en: "Philosophy of Language", es: "Filosofía del Lenguaje" },
    topic: "Como a linguagem se relaciona com o mundo: teoria das descrições (Russell), atos de fala (Austin/Searle), Wittgenstein e os jogos de linguagem, o problema da referência, linguagem como limite do pensamento, pragmática" },
  { id: "philosophy_technology_phil", trackId: "philosophy", order: 16, difficulty: 3,
    title: { pt: "Filosofia da Tecnologia", en: "Philosophy of Technology", es: "Filosofía de la Tecnología" },
    topic: "Grandes questões filosóficas sobre tecnologia: determinismo tecnológico (a tecnologia molda a sociedade ou o contrário?), Heidegger e a essência da técnica, singularidade e pós-humanismo, privacidade, algoritmos e responsabilidade, ética da IA" },
  { id: "philosophy_death", trackId: "philosophy", order: 17, difficulty: 3,
    title: { pt: "Filosofia da Morte e Mortalidade", en: "Philosophy of Death and Mortality", es: "Filosofía de la Muerte y la Mortalidad" },
    topic: "Filosofia da morte: a morte é ruim para quem morre? (argumento epicuriano), imortalidade seria desejável?, como diferentes culturas e filosofias encaram a morte, Heidegger e o ser-para-a-morte, como a consciência da morte molda como vivemos" },
  { id: "philosophy_consciousness", trackId: "philosophy", order: 18, difficulty: 3,
    title: { pt: "O Problema da Consciência", en: "The Problem of Consciousness", es: "El Problema de la Conciencia" },
    topic: "O hard problem of consciousness (Chalmers): o que significa ser consciente, funcionalismo, dualismo, materialismo, qualia e a experiência subjetiva, pode uma IA ser consciente?, o teste de Turing e suas limitações, argumento do quarto chinês de Searle" },

  // ── politics (11–18) ─────────────────────────────────────────────────────────
  { id: "politics_elections", trackId: "politics", order: 11, difficulty: 2,
    title: { pt: "Sistemas Eleitorais", en: "Electoral Systems", es: "Sistemas Electorales" },
    topic: "Como sistemas eleitorais moldam a política: proporcional vs. majoritário (first-past-the-post), Senado e Casa dos Representantes, bipartidarismo vs. multipartidarismo, voto obrigatório, gerrymandering, a matemática por trás das eleições, qual sistema é mais democrático?" },
  { id: "politics_lobbying", trackId: "politics", order: 12, difficulty: 3,
    title: { pt: "Lobbying e Influência Política", en: "Lobbying and Political Influence", es: "Lobbying e Influencia Política" },
    topic: "Como interesses privados influenciam a política: lobbying legal vs. corrupção, captura regulatória, revolving door, financiamento de campanhas (Citizens United nos EUA), o papel dos think tanks, como o dinheiro molda políticas públicas" },
  { id: "politics_policy_making", trackId: "politics", order: 13, difficulty: 2,
    title: { pt: "Como Políticas Públicas São Feitas", en: "How Public Policies Are Made", es: "Cómo Se Hacen las Políticas Públicas" },
    topic: "O ciclo de políticas públicas: identificação de problemas, agenda setting, formulação, implementação, avaliação. O papel da burocracia, das crises, das janelas de oportunidade (Kingdon), por que boas políticas falham na implementação" },
  { id: "politics_international_law", trackId: "politics", order: 14, difficulty: 3,
    title: { pt: "Direito Internacional", en: "International Law", es: "Derecho Internacional" },
    topic: "Como o direito internacional funciona (ou não): fontes (tratados, costume, princípios gerais), o Tribunal Internacional de Justiça, lei humanitária internacional, soberania vs. intervenção humanitária, crimes de guerra, a responsabilidade de proteger (R2P)" },
  { id: "politics_federalism", trackId: "politics", order: 15, difficulty: 2,
    title: { pt: "Federalismo e Poder Local", en: "Federalism and Local Power", es: "Federalismo y Poder Local" },
    topic: "Federalismo: por que alguns países são federações e outros não, como a distribuição de poder entre centro e estados molda política pública, o caso brasileiro vs. americano vs. europeu, descentralização como laboratório de políticas, tensões separatistas" },
  { id: "politics_social_movements", trackId: "politics", order: 16, difficulty: 2,
    title: { pt: "Movimentos Sociais", en: "Social Movements", es: "Movimientos Sociales" },
    topic: "A ciência dos movimentos sociais: como surgem, o que os sustenta, por que a maioria falha, o papel das redes sociais na mobilização contemporânea, movimentos de direita vs. esquerda, de online para offline, casos: Black Lives Matter, #MeToo, Primavera Árabe" },
  { id: "politics_corruption", trackId: "politics", order: 17, difficulty: 3,
    title: { pt: "Corrupção e Accountability", en: "Corruption and Accountability", es: "Corrupción y Rendición de Cuentas" },
    topic: "A economia política da corrupção: por que alguns países são mais corruptos que outros, a armadilha da corrupção sistêmica, custo econômico da corrupção, mecanismos de controle (transparência, imprensa livre, Judiciário independente), casos de sucesso na luta contra corrupção (Singapura, Geórgia, Dinamarca)" },
  { id: "politics_tech_democracy", trackId: "politics", order: 18, difficulty: 3,
    title: { pt: "Tecnologia e Democracia", en: "Technology and Democracy", es: "Tecnología y Democracia" },
    topic: "Como a tecnologia está transformando a democracia: algoritmos e polarização, câmaras de eco, desinformação em escala, vigilância estatal, e-voting, democracia direta digital, autoritarismo digital (China como modelo), o que os governos estão fazendo (e deveriam fazer)" },

  // ── science_tech (11–18) ─────────────────────────────────────────────────────
  { id: "science_quantum", trackId: "science_tech", order: 11, difficulty: 3,
    title: { pt: "Computação Quântica", en: "Quantum Computing", es: "Computación Cuántica" },
    topic: "O que é computação quântica: superposição, entrelaçamento, qubits vs. bits clássicos, o que computadores quânticos podem e não podem fazer, a ameaça à criptografia atual, quem está na corrida (IBM, Google, China), timeline realista para impacto prático" },
  { id: "science_space_race", trackId: "science_tech", order: 12, difficulty: 2,
    title: { pt: "A Nova Corrida Espacial", en: "The New Space Race", es: "La Nueva Carrera Espacial" },
    topic: "A corrida espacial do século XXI: SpaceX, Blue Origin e a privatização do espaço, ambições da China e NASA, a Lua como objetivo estratégico (Hélio-3, posição estratégica), Marte como sonho e desafio, riscos do debris orbital, direito espacial internacional" },
  { id: "science_genetics", trackId: "science_tech", order: 13, difficulty: 3,
    title: { pt: "Genética e Edição Genômica", en: "Genetics and Genome Editing", es: "Genética y Edición Genómica" },
    topic: "CRISPR e a revolução da edição genética: como funciona, aplicações médicas (doenças genéticas, câncer), bebês geneticamente modificados (caso He Jiankui), eugenia 2.0?, o que é e não é possível, implicações éticas, o debate sobre a linha entre terapia e aprimoramento" },
  { id: "science_energy_tech", trackId: "science_tech", order: 14, difficulty: 2,
    title: { pt: "Revolução Energética", en: "The Energy Revolution", es: "La Revolución Energética" },
    topic: "A transição para energia limpa: curva de aprendizado do solar e eólico, armazenamento de energia (baterias, hidrogênio verde), fusão nuclear (NIF, ITER), o problema da intermitência, smart grids, como países estão transitando, a geopolítica dos minerais críticos" },
  { id: "science_materials", trackId: "science_tech", order: 15, difficulty: 3,
    title: { pt: "Novos Materiais", en: "New Materials", es: "Nuevos Materiales" },
    topic: "A revolução dos materiais: grafeno e suas propriedades extraordinárias, nanomateriais, materiais autorreparáveis, metamateriais, impressão 3D de materiais avançados, materiais para eletrônicos flexíveis, o que esses materiais possibilitam em 10-20 anos" },
  { id: "science_robotics", trackId: "science_tech", order: 16, difficulty: 2,
    title: { pt: "Robótica e Automação", en: "Robotics and Automation", es: "Robótica y Automatización" },
    topic: "O estado atual e futuro da robótica: robôs industriais vs. cobots (colaborativos), robôs humanoides (Tesla Optimus, Boston Dynamics), robótica cirúrgica, drones militares e civis, o desafio da 'uncanny valley', automação agrícola, o debate trabalho vs. robôs" },
  { id: "science_consciousness_sci", trackId: "science_tech", order: 17, difficulty: 3,
    title: { pt: "A Ciência da Consciência", en: "The Science of Consciousness", es: "La Ciencia de la Consciencia" },
    topic: "Neurociência da consciência: o que sabemos sobre como o cérebro gera consciência, teoria da informação integrada (Tononi), workspace global (Baars/Dehaene), correlatos neurais da consciência, estados alterados (sono, anestesia, psilocibina), o debate sobre se a IA pode ser consciente" },
  { id: "science_pandemics", trackId: "science_tech", order: 18, difficulty: 2,
    title: { pt: "Pandemias e Saúde Global", en: "Pandemics and Global Health", es: "Pandemias y Salud Global" },
    topic: "A história e ciência das pandemias: como doenças saltam para humanos (zoonoses), o papel das megacidades e da globalização, as lições da COVID-19 (o que funcionou, o que falhou), vacinas e hesitância vacinal, preparação para a próxima pandemia, biossegurança" },

  // ── business (11–18) ─────────────────────────────────────────────────────────
  { id: "business_negotiation", trackId: "business", order: 11, difficulty: 2,
    title: { pt: "A Arte da Negociação", en: "The Art of Negotiation", es: "El Arte de la Negociación" },
    topic: "Fundamentos da negociação: BATNA, ZOPA, negociação distributiva vs. integrativa, a escola de Harvard (Getting to Yes), o papel da ancoragem, como construir rapport, concessões e reciprocidade, negociação intercultural, o método FBI de negociação (Chris Voss)" },
  { id: "business_innovation", trackId: "business", order: 12, difficulty: 3,
    title: { pt: "Inovação: Como Criar o Futuro", en: "Innovation: How to Create the Future", es: "Innovación: Cómo Crear el Futuro" },
    topic: "A ciência da inovação: inovação incremental vs. disruptiva (Christensen), o dilema do inovador, design thinking, lean startup e MVP, inovação aberta, o papel do fracasso na inovação, exemplos de inovação em países e empresas, por que grandes empresas falham em inovar" },
  { id: "business_branding", trackId: "business", order: 13, difficulty: 2,
    title: { pt: "Branding e Identidade de Marca", en: "Branding and Brand Identity", es: "Branding e Identidad de Marca" },
    topic: "O que é uma marca poderosa: brand equity, posicionamento, a diferença entre produto e marca, storytelling de marca, marcas como sinalização de identidade, o papel do design, brand architecture, como marcas morrem e como se renovam, casos Apple vs. Nokia" },
  { id: "business_sustainability", trackId: "business", order: 14, difficulty: 2,
    title: { pt: "Negócios e Sustentabilidade", en: "Business and Sustainability", es: "Negocios y Sostenibilidad" },
    topic: "ESG e sustentabilidade empresarial: o que são as métricas ESG, o debate shareholder vs. stakeholder capitalism (Milton Friedman vs. movimentos modernos), greenwashing vs. sustentabilidade real, B Corps, economia circular aplicada a negócios, o business case para sustentabilidade" },
  { id: "business_platform", trackId: "business", order: 15, difficulty: 3,
    title: { pt: "Economia de Plataformas", en: "Platform Economics", es: "Economía de Plataformas" },
    topic: "Como plataformas funcionam: efeitos de rede, mercados de dois lados, winner-take-all vs. winner-take-most, como plataformas monetizam sem cobrar do usuário, o problema do cold start, Airbnb e Uber como casos, plataformas B2B vs. B2C, regulação de plataformas" },
  { id: "business_hr", trackId: "business", order: 16, difficulty: 2,
    title: { pt: "Gestão de Talentos e Cultura", en: "Talent Management and Culture", es: "Gestión de Talentos y Cultura" },
    topic: "A ciência da gestão de pessoas: o que realmente motiva no trabalho (Deci/Ryan, não dinheiro), cultura organizacional (Schein), como contratar certo, feedback e desenvolvimento, o custo de alta rotatividade, trabalho remoto e cultura, exemplos de culturas excepcionais (Netflix, Pixar, IDEO)" },
  { id: "business_global", trackId: "business", order: 17, difficulty: 3,
    title: { pt: "Negócios Globais", en: "Global Business", es: "Negocios Globales" },
    topic: "Como empresas operam globalmente: estratégias de entrada em mercados internacionais (exportação, licenciamento, joint venture, subsidiária), gestão intercultural, distância CAGE (Ghemawat), armadilhas da expansão internacional, casos de sucesso e fracasso de expansão global" },
  { id: "business_ethics", trackId: "business", order: 18, difficulty: 3,
    title: { pt: "Ética nos Negócios", en: "Business Ethics", es: "Ética en los Negocios" },
    topic: "Ética empresarial além do compliance: o que é uma empresa ética, dilemas éticos reais (whistleblowing, conflito de interesses, demissões em massa), ética de IA nos negócios, the business case for ethics, casos Enron, Volkswagen, Theranos — como o colapso ético acontece" },
];

// ─── PROMPTS ─────────────────────────────────────────────────────────────────

function buildLessonPrompt(pack) {
  return `You are writing premium educational content for Lumen, a mobile learning app. This is a PREMIUM lesson — it should go deeper than the free tier.

Topic: "${pack.title.pt}"
Topic context: ${pack.topic}

Write a detailed educational lesson in Brazilian Portuguese.

Return ONLY a valid JSON object with this structure:
{
  "summary": "<one sentence summary in PT, max 20 words>",
  "blocks": [ ... ]
}

Block types available:
{ "type": "h2", "text": "<section header>" }
{ "type": "p", "text": "<paragraph>" }
{ "type": "quote", "text": "<quote — Author Name>" }
{ "type": "bullets", "items": ["<item>", "<item>", "<item>"] }

Rules for blocks:
- Total: 11 to 14 blocks
- Required: at least 4 h2 section headers (short, descriptive)
- Required: at least 5 p paragraphs (2-4 sentences each, dense, no filler, every sentence adds value)
- Required: at least 2 bullet lists with 3-5 items each
- Required: exactly 1 quote from a real thinker, author, philosopher, or historical figure (must be attributable)
- Narrative structure:
  1. Define and frame the concept precisely
  2. Historical origin or intellectual context
  3. Core mechanics / how it works in depth
  4. Real-world examples (specific cases, countries, people, data)
  5. Counterarguments, limitations, or nuance
  6. Key takeaways — what to remember and apply
- Premium quality: go beyond surface level. Use specific names, dates, data points, and cases.
- Language: Brazilian Portuguese
- Return ONLY the JSON object, no markdown wrapping`;
}

function buildLessonTranslatePrompt(titlePt, titleEn, titleEs, summary, blocksPt) {
  return `Translate this lesson from Brazilian Portuguese to English and Spanish.

PT title: "${titlePt}"
EN title: "${titleEn}"
ES title: "${titleEs}"

Rules:
- Natural, idiomatic translation — NOT word-for-word
- Preserve exact JSON structure and all field names
- Translate ALL text values including bullet items and quotes
- Keep the same block order and types

Input summary (PT): "${summary}"
Input blocks (PT):
${JSON.stringify(blocksPt, null, 2)}

Return ONLY a valid JSON object, no markdown:
{
  "en": { "summary": "<translated>", "blocks": [ ... ] },
  "es": { "summary": "<translated>", "blocks": [ ... ] }
}`;
}

function buildQuizPrompt(titlePt, summary, blocksPt) {
  const lessonText = blocksPt
    .map((b) => (b.type === "bullets" ? b.items.join(". ") : b.text))
    .filter(Boolean)
    .join("\n");

  return `Create 5 multiple-choice quiz questions in Brazilian Portuguese based on this lesson.

Lesson: "${titlePt}"
${lessonText}

Question distribution (in this order):
1. Definition — test recall of a core concept
2. Definition — test another key concept
3. Application — test understanding in context
4. Application — another scenario
5. Example — recognize an example of a concept

Rules:
- 4 options per question
- Vary the correct answer position (do NOT always use index 0 or 1; use 0, 1, 2, 3 across questions)
- Each explanation adds genuine insight beyond restating the answer (1-2 sentences)
- Questions test UNDERSTANDING, not just memorization
- Brazilian Portuguese

Return ONLY a valid JSON array, no markdown:
[
  { "id": "q1", "question": "...", "options": ["...", "...", "...", "..."], "answerIndex": 0, "explanation": "..." },
  ...
]`;
}

function buildQuizTranslatePrompt(quizPt) {
  return `Translate this quiz from Brazilian Portuguese to English and Spanish.

Rules:
- Preserve exact JSON structure
- Keep answerIndex values unchanged
- Natural, idiomatic translation
- Translate question, all options, and explanation

Input (PT):
${JSON.stringify(quizPt, null, 2)}

Return ONLY a valid JSON object, no markdown:
{
  "en": [ ... ],
  "es": [ ... ]
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

async function registerLesson(pack, coverImageUrl = null, coverImageCredit = null) {
  await db.collection("lessons").doc(pack.id).set({
    id: pack.id,
    trackId: pack.trackId,
    version: 1,
    order: pack.order,
    title: pack.title,
    estimatedMinutes: 12,
    difficulty: pack.difficulty,
    tier: "premium",
    prerequisites: [],
    coverImageUrl,
    coverImageCredit,
  });
}

// ─── CORE GENERATOR ──────────────────────────────────────────────────────────

async function generatePack(pack) {
  // Step 1: Generate lesson in PT
  const lessonRes = await anthropic.messages.create({
    model: MODEL_GEN,
    max_tokens: 3000,
    messages: [{ role: "user", content: buildLessonPrompt(pack) }],
  });

  const lessonRaw = lessonRes.content[0].text.trim();
  const lessonPt = JSON.parse(lessonRaw);
  const { summary: summaryPt, blocks: blocksPt } = lessonPt;

  if (!Array.isArray(blocksPt) || blocksPt.length < 8) {
    throw new Error(`PT lesson too short: ${blocksPt?.length} blocks`);
  }

  // Step 2: Translate lesson to EN + ES
  const transRes = await anthropic.messages.create({
    model: MODEL_TRANS,
    max_tokens: 5000,
    messages: [{ role: "user", content: buildLessonTranslatePrompt(
      pack.title.pt, pack.title.en, pack.title.es, summaryPt, blocksPt
    )}],
  });

  const transRaw = transRes.content[0].text.trim();
  const translations = JSON.parse(transRaw);
  const { en: { summary: summaryEn, blocks: blocksEn }, es: { summary: summaryEs, blocks: blocksEs } } = translations;

  if (!Array.isArray(blocksEn) || blocksEn.length < 8) throw new Error(`EN translation too short`);
  if (!Array.isArray(blocksEs) || blocksEs.length < 8) throw new Error(`ES translation too short`);

  // Step 3: Generate quiz in PT
  const quizRes = await anthropic.messages.create({
    model: MODEL_GEN,
    max_tokens: 2000,
    messages: [{ role: "user", content: buildQuizPrompt(pack.title.pt, summaryPt, blocksPt) }],
  });

  const quizPt = JSON.parse(quizRes.content[0].text.trim());
  if (!Array.isArray(quizPt) || quizPt.length !== 5) {
    throw new Error(`Expected 5 PT questions, got ${quizPt?.length}`);
  }
  quizPt.forEach((q, i) => { q.id = `q${i + 1}`; });

  // Step 4: Translate quiz to EN + ES
  const quizTransRes = await anthropic.messages.create({
    model: MODEL_TRANS,
    max_tokens: 3000,
    messages: [{ role: "user", content: buildQuizTranslatePrompt(quizPt) }],
  });

  const quizTransRaw = quizTransRes.content[0].text.trim();
  const quizTrans = JSON.parse(quizTransRaw);
  const quizEn = quizTrans.en;
  const quizEs = quizTrans.es;

  if (!Array.isArray(quizEn) || quizEn.length !== 5) throw new Error(`EN quiz wrong length`);
  if (!Array.isArray(quizEs) || quizEs.length !== 5) throw new Error(`ES quiz wrong length`);
  quizEn.forEach((q, i) => { q.id = `q${i + 1}`; });
  quizEs.forEach((q, i) => { q.id = `q${i + 1}`; });

  if (dryRun) {
    console.log(`  [DRY RUN] Would upload ${pack.id} (${blocksPt.length} PT blocks, ${quizPt.length} questions)`);
    return;
  }

  // Step 5: Upload to Firebase Storage
  const makePackJson = (lang, title, summary, blocks, quiz) => ({
    id: pack.id,
    version: 1,
    lesson: { title, summary, audioUrl: null, blocks },
    cards: [],
    quiz,
  });

  await Promise.all([
    uploadLang(pack.id, "pt", makePackJson("pt", pack.title.pt, summaryPt, blocksPt, quizPt)),
    uploadLang(pack.id, "en", makePackJson("en", pack.title.en, summaryEn, blocksEn, quizEn)),
    uploadLang(pack.id, "es", makePackJson("es", pack.title.es, summaryEs, blocksEs, quizEs)),
  ]);

  // Step 6: Register in Firestore
  await registerLesson(pack);
}

// ─── MAIN ─────────────────────────────────────────────────────────────────────

async function main() {
  if (!process.env.ANTHROPIC_API_KEY) {
    console.error("Missing ANTHROPIC_API_KEY");
    process.exit(1);
  }

  let packs = PREMIUM_PACKS;
  if (trackFilter) packs = packs.filter(p => p.trackId === trackFilter);
  if (idFilter) packs = packs.filter(p => p.id === idFilter);

  // Skip packs already uploaded (allows resuming interrupted runs)
  const toGenerate = [];
  for (const pack of packs) {
    if (!dryRun && await packExists(pack.id)) {
      console.log(`  skip ${pack.id} (already exists)`);
    } else {
      toGenerate.push(pack);
    }
  }

  console.log(`\nGenerating ${toGenerate.length} premium packs (model: ${MODEL_GEN}, concurrency: ${CONCURRENCY})${dryRun ? " [DRY RUN]" : ""}...\n`);

  let ok = 0, failed = 0;
  const errors = [];

  for (let i = 0; i < toGenerate.length; i += CONCURRENCY) {
    const batch = toGenerate.slice(i, i + CONCURRENCY);
    await Promise.all(batch.map(async (pack) => {
      process.stdout.write(`  [${pack.trackId}] ${pack.id} (order ${pack.order})... `);
      try {
        await generatePack(pack);
        console.log(`✓`);
        ok++;
      } catch (err) {
        console.log(`✗ ${err.message}`);
        errors.push({ id: pack.id, error: err.message });
        failed++;
      }
    }));
  }

  console.log(`\nDone. ${ok} generated, ${failed} failed.`);
  if (errors.length > 0) {
    console.log("\nFailed packs:");
    errors.forEach(e => console.log(`  ${e.id}: ${e.error}`));
  }
  process.exit(0);
}

main().catch(err => { console.error(err); process.exit(1); });
