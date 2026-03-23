/**
 * Lumen — Generate & Upload Packs
 *
 * Gera novos packs de conteúdo e sobe para o Firebase Storage.
 * Registra metadados no Firestore (coleção "lessons").
 *
 * Como usar:
 *   cd scripts
 *   node generate-packs.js
 *
 * Requisitos: serviceAccountKey.json nesta pasta.
 */

const admin = require("firebase-admin");
const path = require("path");
const fs = require("fs");

const serviceAccount = require(path.join(__dirname, "serviceAccountKey.json"));

admin.initializeApp({
  credential: admin.credential.cert(serviceAccount),
  storageBucket: "lumen-13d0d.firebasestorage.app",
});

const db = admin.firestore();
const bucket = admin.storage().bucket();

// ─── PACK CONTENT ─────────────────────────────────────────────────────────────

const PACKS = [

  // ── geopolitics_middle_east ─────────────────────────────────────────────────
  {
    id: "geopolitics_middle_east",
    version: 1,
    trackId: "geopolitics",
    order: 4,
    estimatedMinutes: 10,
    difficulty: 3,
    langs: {
      pt: {
        title: "O Oriente Médio em Disputa",
        lesson: {
          title: "O Oriente Médio em Disputa",
          summary: "Por que essa região concentra tantos conflitos e por que o mundo inteiro presta atenção.",
          audioUrl: null,
          blocks: [
            { type: "h2", text: "Por que o Oriente Médio importa?" },
            { type: "p", text: "O Oriente Médio é estratégico por três razões centrais: reservas colossais de petróleo, posição geográfica entre Europa, Ásia e África, e o peso religioso que une e divide bilhões de pessoas." },
            { type: "p", text: "Cerca de 30% do petróleo mundial passa pelo Estreito de Ormuz. Um bloqueio ali cria ondas de choque na economia global em dias." },
            { type: "h2", text: "As linhas de conflito" },
            { type: "p", text: "Os conflitos na região raramente têm uma única causa. Eles entrelaçam disputas por recursos, rivalidades religiosas, legados coloniais europeus e interferência de potências externas." },
            { type: "bullets", items: [
              "Arábia Saudita (sunita) vs Irã (xiita): a rivalidade central da região",
              "Israel e Palestina: conflito territorial, identitário e religioso com décadas de impasse",
              "Síria e Iêmen: guerras por procuração onde EUA, Rússia e potências regionais financiam lados opostos"
            ]},
            { type: "h2", text: "Quem joga nesse tabuleiro?" },
            { type: "p", text: "Além dos atores locais, EUA, Rússia, China e Europa têm interesses concretos na região — seja pelo petróleo, contenção de extremismos ou influência geopolítica de longo prazo." },
            { type: "quote", text: "Os países não têm amigos permanentes, apenas interesses permanentes. — Lord Palmerston" }
          ]
        },
        cards: [
          { id: "c1", front: "Por que o Estreito de Ormuz é estratégico?", back: "Porque ~30% do petróleo mundial passa por ele. Bloqueá-lo afeta imediatamente a economia global." },
          { id: "c2", front: "Qual é a principal divisão religiosa que alimenta conflitos no Oriente Médio?", back: "A divisão entre sunitas (Arábia Saudita) e xiitas (Irã), que se manifesta em disputas políticas e guerras por procuração." },
          { id: "c3", front: "O que são guerras por procuração?", back: "Conflitos em que potências externas financiam e armam lados opostos sem entrar diretamente no combate." },
          { id: "c4", front: "Por que o legado colonial ainda importa na região?", back: "As fronteiras traçadas pelos europeus no séc. XX ignoraram tribos e etnias históricas, criando tensões que persistem até hoje." }
        ],
        quiz: [
          {
            id: "q1",
            question: "Qual estreito é crítico para o transporte de petróleo mundial?",
            options: ["Estreito de Gibraltar", "Estreito de Ormuz", "Estreito de Bering", "Canal de Suez"],
            answerIndex: 1,
            explanation: "O Estreito de Ormuz, entre o Irã e os Emirados Árabes, é a passagem de ~30% do petróleo mundial. Sua importância estratégica é enorme."
          },
          {
            id: "q2",
            question: "A rivalidade entre Arábia Saudita e Irã é, em parte, alimentada por:",
            options: ["Diferenças linguísticas", "Divisão entre sunitas e xiitas", "Disputa por acesso ao Mediterrâneo", "Concorrência tecnológica"],
            answerIndex: 1,
            explanation: "A Arábia Saudita lidera o mundo sunita; o Irã é o principal Estado xiita. Essa divisão religiosa se traduz em conflitos políticos e militares em toda a região."
          },
          {
            id: "q3",
            question: "Por que países como EUA e Rússia se envolvem em conflitos do Oriente Médio?",
            options: ["Por obrigação com tratados humanitários", "Por interesses estratégicos: petróleo, influência e contenção de rivais", "Para promover democracia na região", "Por pressão de organismos internacionais"],
            answerIndex: 1,
            explanation: "O envolvimento externo é movido por interesses concretos — acesso a recursos, posicionamento geopolítico e contenção de potências rivais — não por altruísmo."
          }
        ]
      },
      en: {
        title: "The Contested Middle East",
        lesson: {
          title: "The Contested Middle East",
          summary: "Why this region concentrates so many conflicts and why the whole world pays attention.",
          audioUrl: null,
          blocks: [
            { type: "h2", text: "Why does the Middle East matter?" },
            { type: "p", text: "The Middle East is strategically vital for three core reasons: massive oil reserves, geographical position between Europe, Asia, and Africa, and religious significance shared by billions of people worldwide." },
            { type: "p", text: "Around 30% of the world's oil passes through the Strait of Hormuz. A blockade there sends shockwaves through the global economy within days." },
            { type: "h2", text: "Lines of conflict" },
            { type: "p", text: "Conflicts in the region rarely have a single cause. They interweave resource disputes, religious rivalries, European colonial legacies, and interference from external powers." },
            { type: "bullets", items: [
              "Saudi Arabia (Sunni) vs Iran (Shia): the region's central rivalry",
              "Israel and Palestine: territorial, identity, and religious conflict with decades of deadlock",
              "Syria and Yemen: proxy wars where the US, Russia, and regional powers fund opposing sides"
            ]},
            { type: "h2", text: "Who plays on this board?" },
            { type: "p", text: "Beyond local actors, the US, Russia, China, and Europe all have concrete interests in the region — whether for oil, counterterrorism, or long-term geopolitical influence." },
            { type: "quote", text: "Nations have no permanent friends, only permanent interests. — Lord Palmerston" }
          ]
        },
        cards: [
          { id: "c1", front: "Why is the Strait of Hormuz strategically important?", back: "Because ~30% of the world's oil passes through it. Blocking it immediately disrupts the global economy." },
          { id: "c2", front: "What is the main religious divide fueling Middle Eastern conflicts?", back: "The Sunni-Shia split, with Saudi Arabia leading the Sunni world and Iran as the main Shia state." },
          { id: "c3", front: "What are proxy wars?", back: "Conflicts where external powers fund and arm opposing sides without directly entering combat." },
          { id: "c4", front: "Why does the colonial legacy still matter in the region?", back: "European-drawn borders in the 20th century ignored historical tribes and ethnicities, creating tensions that persist today." }
        ],
        quiz: [
          {
            id: "q1",
            question: "Which strait is critical for global oil transport?",
            options: ["Strait of Gibraltar", "Strait of Hormuz", "Bering Strait", "Suez Canal"],
            answerIndex: 1,
            explanation: "The Strait of Hormuz, between Iran and the UAE, carries ~30% of the world's oil. Its strategic importance cannot be overstated."
          },
          {
            id: "q2",
            question: "The rivalry between Saudi Arabia and Iran is partly fueled by:",
            options: ["Language differences", "The Sunni-Shia divide", "Competition for Mediterranean access", "Technological rivalry"],
            answerIndex: 1,
            explanation: "Saudi Arabia leads the Sunni world; Iran is the main Shia state. This religious division translates into political and military conflicts throughout the region."
          },
          {
            id: "q3",
            question: "Why do countries like the US and Russia get involved in Middle Eastern conflicts?",
            options: ["Due to humanitarian treaty obligations", "For strategic interests: oil, influence, and containing rivals", "To promote democracy in the region", "Under pressure from international organizations"],
            answerIndex: 1,
            explanation: "External involvement is driven by concrete interests — resource access, geopolitical positioning, and containing rival powers — not altruism."
          }
        ]
      },
      es: {
        title: "El Oriente Medio en Disputa",
        lesson: {
          title: "El Oriente Medio en Disputa",
          summary: "Por qué esta región concentra tantos conflictos y por qué el mundo entero presta atención.",
          audioUrl: null,
          blocks: [
            { type: "h2", text: "¿Por qué importa el Oriente Medio?" },
            { type: "p", text: "El Oriente Medio es estratégicamente vital por tres razones: enormes reservas de petróleo, posición geográfica entre Europa, Asia y África, y significado religioso compartido por miles de millones de personas." },
            { type: "p", text: "Alrededor del 30% del petróleo mundial pasa por el Estrecho de Ormuz. Un bloqueo allí genera ondas de choque en la economía global en cuestión de días." },
            { type: "h2", text: "Las líneas de conflicto" },
            { type: "p", text: "Los conflictos en la región rara vez tienen una sola causa. Entrelazan disputas por recursos, rivalidades religiosas, legados coloniales europeos e interferencia de potencias externas." },
            { type: "bullets", items: [
              "Arabia Saudita (sunita) vs Irán (chií): la rivalidad central de la región",
              "Israel y Palestina: conflicto territorial, identitario y religioso con décadas de punto muerto",
              "Siria y Yemen: guerras por delegación donde EE.UU., Rusia y potencias regionales financian bandos opuestos"
            ]},
            { type: "h2", text: "¿Quién juega en este tablero?" },
            { type: "p", text: "Más allá de los actores locales, EE.UU., Rusia, China y Europa tienen intereses concretos en la región: petróleo, contención del extremismo e influencia geopolítica a largo plazo." },
            { type: "quote", text: "Las naciones no tienen amigos permanentes, solo intereses permanentes. — Lord Palmerston" }
          ]
        },
        cards: [
          { id: "c1", front: "¿Por qué el Estrecho de Ormuz es estratégico?", back: "Porque ~30% del petróleo mundial pasa por él. Bloquearlo afecta inmediatamente la economía global." },
          { id: "c2", front: "¿Cuál es la principal división religiosa que alimenta los conflictos en Oriente Medio?", back: "La división sunita-chií, con Arabia Saudita liderando el mundo sunita e Irán como principal Estado chií." },
          { id: "c3", front: "¿Qué son las guerras por delegación?", back: "Conflictos donde potencias externas financian y arman bandos opuestos sin entrar directamente en combate." },
          { id: "c4", front: "¿Por qué el legado colonial sigue importando en la región?", back: "Las fronteras trazadas por europeos en el siglo XX ignoraron tribus y etnias históricas, creando tensiones que persisten hoy." }
        ],
        quiz: [
          {
            id: "q1",
            question: "¿Qué estrecho es crítico para el transporte de petróleo mundial?",
            options: ["Estrecho de Gibraltar", "Estrecho de Ormuz", "Estrecho de Bering", "Canal de Suez"],
            answerIndex: 1,
            explanation: "El Estrecho de Ormuz, entre Irán y los EAU, transporta ~30% del petróleo mundial. Su importancia estratégica es enorme."
          },
          {
            id: "q2",
            question: "La rivalidad entre Arabia Saudita e Irán está impulsada en parte por:",
            options: ["Diferencias lingüísticas", "La división sunita-chií", "Competencia por el acceso al Mediterráneo", "Rivalidad tecnológica"],
            answerIndex: 1,
            explanation: "Arabia Saudita lidera el mundo sunita; Irán es el principal Estado chií. Esta división religiosa se traduce en conflictos políticos y militares en toda la región."
          },
          {
            id: "q3",
            question: "¿Por qué países como EE.UU. y Rusia se involucran en conflictos de Oriente Medio?",
            options: ["Por obligación con tratados humanitarios", "Por intereses estratégicos: petróleo, influencia y contención de rivales", "Para promover la democracia en la región", "Por presión de organismos internacionales"],
            answerIndex: 1,
            explanation: "La intervención externa está motivada por intereses concretos: acceso a recursos, posicionamiento geopolítico y contención de potencias rivales, no por altruismo."
          }
        ]
      }
    }
  },

  // ── geopolitics_china_usa ───────────────────────────────────────────────────
  {
    id: "geopolitics_china_usa",
    version: 1,
    trackId: "geopolitics",
    order: 5,
    estimatedMinutes: 10,
    difficulty: 3,
    langs: {
      pt: {
        title: "China vs EUA: A Nova Guerra Fria",
        lesson: {
          title: "China vs EUA: A Nova Guerra Fria",
          summary: "A disputa que está redesenhando a ordem global do século XXI.",
          audioUrl: null,
          blocks: [
            { type: "h2", text: "Da cooperação à rivalidade" },
            { type: "p", text: "Durante décadas, EUA e China cresceram juntos. Os americanos compravam produtos chineses baratos; a China usava os dólares para financiar seu desenvolvimento. Era uma codependência conveniente." },
            { type: "p", text: "Isso começou a mudar quando a China parou de ser apenas uma fábrica e passou a competir em tecnologia, inteligência artificial, energia limpa e influência militar." },
            { type: "h2", text: "As frentes da disputa" },
            { type: "bullets", items: [
              "Tecnologia: quem controla os chips, a IA e as redes 5G controla a economia do futuro",
              "Taiwan: a China reivindica a ilha; os EUA a defendem informalmente — é o ponto mais explosivo",
              "Mar do Sul da China: Pequim controla ilhas disputadas que são rotas comerciais vitais",
              "Dólar vs Yuan: a China quer reduzir a dependência global do dólar americano"
            ]},
            { type: "h2", text: "Desacoplamento ou interdependência?" },
            { type: "p", text: "Os EUA querem 'desacoplar' setores estratégicos da China. Mas as economias estão tão entrelaçadas que um desacoplamento total seria catastrófico para ambos — e para o mundo." },
            { type: "quote", text: "A Chimérica acabou. A questão é se o divórcio será civilizado. — paráfrase de analistas de relações internacionais" }
          ]
        },
        cards: [
          { id: "c1", front: "O que é 'Chimérica'?", back: "Termo que descreve a codependência econômica entre China e América: os EUA consumiam, a China produzia e financiava a dívida americana." },
          { id: "c2", front: "Por que Taiwan é o ponto mais explosivo da rivalidade?", back: "A China reivindica Taiwan como parte de seu território. Os EUA vendem armas e defendem informalmente a ilha. Um conflito armado envolveria as duas maiores potências mundiais." },
          { id: "c3", front: "Por que o controle de chips semicondutores é geopoliticamente relevante?", back: "Chips são a base de toda tecnologia moderna. Quem controla a produção de chips avançados controla a corrida por IA, defesa e manufatura do futuro." },
          { id: "c4", front: "O que é o 'desacoplamento' (decoupling)?", back: "A tentativa dos EUA de reduzir a dependência de cadeias de suprimento chinesas em setores estratégicos como tecnologia e farmacêuticos." }
        ],
        quiz: [
          {
            id: "q1",
            question: "Qual ilha é o ponto geopolítico mais explosivo entre China e EUA?",
            options: ["Ilhas Havai", "Taiwan", "Ilhas Malvinas", "Okinawa"],
            answerIndex: 1,
            explanation: "Taiwan é reivindicada pela China como território próprio. Os EUA mantêm relações não-oficiais e fornecem armamentos. Um conflito ali envolveria diretamente as duas superpotências."
          },
          {
            id: "q2",
            question: "A disputa por semicondutores (chips) é importante porque:",
            options: ["Chips são a principal exportação da China", "Quem controla chips avançados controla a tecnologia, IA e defesa do futuro", "Os EUA dependem de chips chineses para a maioria dos produtos", "É uma disputa simbólica sem impacto econômico real"],
            answerIndex: 1,
            explanation: "Chips são o petróleo do século XXI. Toda tecnologia avançada — IA, telecomunicações, armamentos — depende deles. Controlar sua produção é ter vantagem estratégica decisiva."
          },
          {
            id: "q3",
            question: "Por que o 'desacoplamento' total entre EUA e China seria difícil?",
            options: ["Porque há um tratado impedindo a separação econômica", "Porque as economias são tão interdependentes que um corte total seria devastador para ambos", "Porque a China já se tornou autossuficiente", "Porque os EUA precisam de mão de obra chinesa"],
            answerIndex: 1,
            explanation: "Décadas de integração econômica criaram cadeias de suprimento profundamente entrelaçadas. Desacoplar setores-chave é possível; separação total causaria uma crise econômica global."
          }
        ]
      },
      en: {
        title: "China vs USA: The New Cold War",
        lesson: {
          title: "China vs USA: The New Cold War",
          summary: "The rivalry reshaping the global order of the 21st century.",
          audioUrl: null,
          blocks: [
            { type: "h2", text: "From cooperation to rivalry" },
            { type: "p", text: "For decades, the US and China grew together. Americans bought cheap Chinese goods; China used the dollars to finance its development. It was a convenient codependency." },
            { type: "p", text: "This began to change when China stopped being just a factory and started competing in technology, artificial intelligence, clean energy, and military influence." },
            { type: "h2", text: "Fronts of the dispute" },
            { type: "bullets", items: [
              "Technology: whoever controls chips, AI, and 5G networks controls the economy of the future",
              "Taiwan: China claims the island; the US defends it informally — the most explosive flashpoint",
              "South China Sea: Beijing controls disputed islands along vital commercial routes",
              "Dollar vs Yuan: China wants to reduce global dependence on the US dollar"
            ]},
            { type: "h2", text: "Decoupling or interdependence?" },
            { type: "p", text: "The US wants to 'decouple' strategic sectors from China. But the economies are so intertwined that a total decoupling would be catastrophic for both — and for the world." },
            { type: "quote", text: "Chimerica is over. The question is whether the divorce will be civilized. — paraphrase of international relations analysts" }
          ]
        },
        cards: [
          { id: "c1", front: "What is 'Chimerica'?", back: "A term describing the economic codependency between China and America: the US consumed, China produced and financed American debt." },
          { id: "c2", front: "Why is Taiwan the most explosive flashpoint in the rivalry?", back: "China claims Taiwan as its own territory. The US sells arms and informally defends the island. Armed conflict would directly involve the two largest world powers." },
          { id: "c3", front: "Why is control of semiconductor chips geopolitically relevant?", back: "Chips are the foundation of all modern technology. Whoever controls advanced chip production controls the race for AI, defense, and future manufacturing." },
          { id: "c4", front: "What is 'decoupling'?", back: "The US attempt to reduce dependence on Chinese supply chains in strategic sectors like technology and pharmaceuticals." }
        ],
        quiz: [
          {
            id: "q1",
            question: "Which island is the most explosive geopolitical flashpoint between China and the US?",
            options: ["Hawaii", "Taiwan", "Falkland Islands", "Okinawa"],
            answerIndex: 1,
            explanation: "Taiwan is claimed by China as its own territory. The US maintains unofficial relations and supplies weapons. A conflict there would directly involve both superpowers."
          },
          {
            id: "q2",
            question: "The dispute over semiconductors (chips) matters because:",
            options: ["Chips are China's main export", "Whoever controls advanced chips controls technology, AI, and future defense", "The US depends on Chinese chips for most products", "It's a symbolic dispute with no real economic impact"],
            answerIndex: 1,
            explanation: "Chips are the oil of the 21st century. All advanced technology — AI, telecommunications, weapons — depends on them. Controlling their production means decisive strategic advantage."
          },
          {
            id: "q3",
            question: "Why would total 'decoupling' between the US and China be difficult?",
            options: ["Because a treaty prevents economic separation", "Because the economies are so interdependent that a full split would be devastating for both", "Because China has already become self-sufficient", "Because the US needs Chinese labor"],
            answerIndex: 1,
            explanation: "Decades of economic integration have created deeply intertwined supply chains. Decoupling key sectors is possible; total separation would trigger a global economic crisis."
          }
        ]
      },
      es: {
        title: "China vs EE.UU.: La Nueva Guerra Fría",
        lesson: {
          title: "China vs EE.UU.: La Nueva Guerra Fría",
          summary: "La rivalidad que está rediseñando el orden global del siglo XXI.",
          audioUrl: null,
          blocks: [
            { type: "h2", text: "De la cooperación a la rivalidad" },
            { type: "p", text: "Durante décadas, EE.UU. y China crecieron juntos. Los estadounidenses compraban productos chinos baratos; China usaba los dólares para financiar su desarrollo. Era una codependencia conveniente." },
            { type: "p", text: "Esto comenzó a cambiar cuando China dejó de ser solo una fábrica y empezó a competir en tecnología, inteligencia artificial, energía limpia e influencia militar." },
            { type: "h2", text: "Los frentes de la disputa" },
            { type: "bullets", items: [
              "Tecnología: quien controla los chips, la IA y las redes 5G controla la economía del futuro",
              "Taiwán: China reclama la isla; EE.UU. la defiende informalmente — el punto más explosivo",
              "Mar del Sur de China: Pekín controla islas disputadas que son rutas comerciales vitales",
              "Dólar vs Yuan: China quiere reducir la dependencia global del dólar estadounidense"
            ]},
            { type: "h2", text: "¿Desacoplamiento o interdependencia?" },
            { type: "p", text: "EE.UU. quiere 'desacoplar' sectores estratégicos de China. Pero las economías están tan entrelazadas que un desacoplamiento total sería catastrófico para ambos y para el mundo." },
            { type: "quote", text: "La Chimérica terminó. La pregunta es si el divorcio será civilizado. — paráfrasis de analistas de relaciones internacionales" }
          ]
        },
        cards: [
          { id: "c1", front: "¿Qué es la 'Chimérica'?", back: "Término que describe la codependencia económica entre China y América: EE.UU. consumía, China producía y financiaba la deuda estadounidense." },
          { id: "c2", front: "¿Por qué Taiwán es el punto más explosivo de la rivalidad?", back: "China reclama Taiwán como su territorio. EE.UU. vende armas y defiende informalmente la isla. Un conflicto armado involucraría a las dos mayores potencias mundiales." },
          { id: "c3", front: "¿Por qué el control de chips semiconductores es geopolíticamente relevante?", back: "Los chips son la base de toda la tecnología moderna. Quien controla la producción de chips avanzados controla la carrera por la IA, la defensa y la manufactura del futuro." },
          { id: "c4", front: "¿Qué es el 'desacoplamiento' (decoupling)?", back: "El intento de EE.UU. de reducir la dependencia de las cadenas de suministro chinas en sectores estratégicos como tecnología y farmacéuticos." }
        ],
        quiz: [
          {
            id: "q1",
            question: "¿Qué isla es el punto geopolítico más explosivo entre China y EE.UU.?",
            options: ["Hawái", "Taiwán", "Islas Malvinas", "Okinawa"],
            answerIndex: 1,
            explanation: "Taiwán es reclamada por China como su propio territorio. EE.UU. mantiene relaciones no oficiales y suministra armas. Un conflicto allí involucraría directamente a las dos superpotencias."
          },
          {
            id: "q2",
            question: "La disputa por semiconductores (chips) importa porque:",
            options: ["Los chips son la principal exportación de China", "Quien controla chips avanzados controla la tecnología, la IA y la defensa del futuro", "EE.UU. depende de chips chinos para la mayoría de sus productos", "Es una disputa simbólica sin impacto económico real"],
            answerIndex: 1,
            explanation: "Los chips son el petróleo del siglo XXI. Toda la tecnología avanzada —IA, telecomunicaciones, armamentos— depende de ellos. Controlar su producción significa ventaja estratégica decisiva."
          },
          {
            id: "q3",
            question: "¿Por qué el desacoplamiento total entre EE.UU. y China sería difícil?",
            options: ["Porque un tratado impide la separación económica", "Porque las economías son tan interdependientes que una ruptura total sería devastadora para ambos", "Porque China ya es autosuficiente", "Porque EE.UU. necesita mano de obra china"],
            answerIndex: 1,
            explanation: "Décadas de integración económica crearon cadenas de suministro profundamente entrelazadas. Desacoplar sectores clave es posible; la separación total causaría una crisis económica global."
          }
        ]
      }
    }
  },

  // ── economics_fiscal_policy ─────────────────────────────────────────────────
  {
    id: "economics_fiscal_policy",
    version: 1,
    trackId: "economics",
    order: 4,
    estimatedMinutes: 9,
    difficulty: 2,
    langs: {
      pt: {
        title: "Política Fiscal: O Governo e o Dinheiro",
        lesson: {
          title: "Política Fiscal: O Governo e o Dinheiro",
          summary: "Como governos usam gastos e impostos para moldar a economia — e por que isso te afeta diretamente.",
          audioUrl: null,
          blocks: [
            { type: "h2", text: "O que é política fiscal?" },
            { type: "p", text: "Política fiscal é o conjunto de decisões do governo sobre quanto arrecadar em impostos e quanto gastar. Essas duas alavancas — receita e despesa — moldam a velocidade da economia." },
            { type: "h2", text: "Expansionista vs Contracionista" },
            { type: "p", text: "Quando a economia está fraca, o governo pode estimulá-la gastando mais ou reduzindo impostos (política expansionista). Quando a inflação está alta, pode fazer o contrário: cortar gastos ou aumentar impostos (política contracionista)." },
            { type: "bullets", items: [
              "Gastos públicos: obras, saúde, educação, transferências — injetam dinheiro na economia",
              "Impostos: retiram dinheiro da circulação — freiam ou estimulam setores específicos",
              "Déficit fiscal: quando o governo gasta mais do que arrecada — financia com dívida"
            ]},
            { type: "h2", text: "O debate eterno: dívida pública" },
            { type: "p", text: "Governos frequentemente gastam mais do que arrecadam, criando déficit e acumulando dívida. Economistas debatem: dívida em excesso freia o crescimento futuro ou é um instrumento legítimo de desenvolvimento?" },
            { type: "quote", text: "No longo prazo, todos estaremos mortos. — John Maynard Keynes, defendendo a ação fiscal no curto prazo" }
          ]
        },
        cards: [
          { id: "c1", front: "O que é política fiscal?", back: "As decisões do governo sobre arrecadação de impostos e nível de gastos públicos para influenciar a economia." },
          { id: "c2", front: "O que é uma política fiscal expansionista?", back: "Quando o governo aumenta gastos ou reduz impostos para estimular a economia — tipicamente usada em recessões." },
          { id: "c3", front: "O que é déficit fiscal?", back: "Quando o governo gasta mais do que arrecada. A diferença é coberta com emissão de dívida (títulos públicos)." },
          { id: "c4", front: "Qual a diferença entre política fiscal e política monetária?", back: "Fiscal: decisões de gastos e impostos (governo). Monetária: decisões sobre juros e oferta de dinheiro (banco central)." }
        ],
        quiz: [
          {
            id: "q1",
            question: "Um governo que aumenta gastos em infraestrutura durante uma recessão está aplicando:",
            options: ["Política fiscal contracionista", "Política fiscal expansionista", "Política monetária expansionista", "Austeridade fiscal"],
            answerIndex: 1,
            explanation: "Aumentar gastos públicos injeta dinheiro na economia, estimulando atividade — isso é política fiscal expansionista, típica em períodos de recessão."
          },
          {
            id: "q2",
            question: "O déficit fiscal ocorre quando:",
            options: ["O banco central aumenta os juros", "O governo gasta mais do que arrecada em impostos", "A inflação supera o crescimento do PIB", "As exportações superam as importações"],
            answerIndex: 1,
            explanation: "Déficit fiscal = despesas do governo > receitas fiscais. A diferença precisa ser financiada com emissão de dívida pública."
          },
          {
            id: "q3",
            question: "Qual instituição é responsável pela política fiscal em um país?",
            options: ["Banco Central", "FMI", "Governo (Executivo e Legislativo)", "Bolsa de valores"],
            answerIndex: 2,
            explanation: "A política fiscal é definida pelo governo — o Executivo propõe o orçamento e o Legislativo aprova. O Banco Central cuida da política monetária, que é independente."
          }
        ]
      },
      en: {
        title: "Fiscal Policy: Government and Money",
        lesson: {
          title: "Fiscal Policy: Government and Money",
          summary: "How governments use spending and taxes to shape the economy — and why it directly affects you.",
          audioUrl: null,
          blocks: [
            { type: "h2", text: "What is fiscal policy?" },
            { type: "p", text: "Fiscal policy is the set of government decisions about how much to collect in taxes and how much to spend. These two levers — revenue and expenditure — shape the speed of the economy." },
            { type: "h2", text: "Expansionary vs Contractionary" },
            { type: "p", text: "When the economy is weak, the government can stimulate it by spending more or cutting taxes (expansionary policy). When inflation is high, it can do the opposite: cut spending or raise taxes (contractionary policy)." },
            { type: "bullets", items: [
              "Public spending: infrastructure, healthcare, education, transfers — inject money into the economy",
              "Taxes: withdraw money from circulation — slow or stimulate specific sectors",
              "Fiscal deficit: when the government spends more than it collects — financed with debt"
            ]},
            { type: "h2", text: "The eternal debate: public debt" },
            { type: "p", text: "Governments frequently spend more than they collect, creating deficits and accumulating debt. Economists debate: does excessive debt slow future growth, or is it a legitimate development instrument?" },
            { type: "quote", text: "In the long run, we are all dead. — John Maynard Keynes, defending short-term fiscal action" }
          ]
        },
        cards: [
          { id: "c1", front: "What is fiscal policy?", back: "Government decisions about tax collection and public spending levels to influence the economy." },
          { id: "c2", front: "What is expansionary fiscal policy?", back: "When the government increases spending or cuts taxes to stimulate the economy — typically used during recessions." },
          { id: "c3", front: "What is a fiscal deficit?", back: "When the government spends more than it collects. The difference is covered by issuing debt (government bonds)." },
          { id: "c4", front: "What is the difference between fiscal and monetary policy?", back: "Fiscal: spending and tax decisions (government). Monetary: interest rate and money supply decisions (central bank)." }
        ],
        quiz: [
          {
            id: "q1",
            question: "A government increasing infrastructure spending during a recession is applying:",
            options: ["Contractionary fiscal policy", "Expansionary fiscal policy", "Expansionary monetary policy", "Fiscal austerity"],
            answerIndex: 1,
            explanation: "Increasing public spending injects money into the economy, stimulating activity — that's expansionary fiscal policy, typical in recession periods."
          },
          {
            id: "q2",
            question: "A fiscal deficit occurs when:",
            options: ["The central bank raises interest rates", "The government spends more than it collects in taxes", "Inflation exceeds GDP growth", "Exports exceed imports"],
            answerIndex: 1,
            explanation: "Fiscal deficit = government expenditures > tax revenues. The difference must be financed by issuing public debt."
          },
          {
            id: "q3",
            question: "Which institution is responsible for fiscal policy in a country?",
            options: ["Central Bank", "IMF", "Government (Executive and Legislative)", "Stock exchange"],
            answerIndex: 2,
            explanation: "Fiscal policy is set by the government — the Executive proposes the budget and the Legislature approves it. The Central Bank handles monetary policy independently."
          }
        ]
      },
      es: {
        title: "Política Fiscal: El Gobierno y el Dinero",
        lesson: {
          title: "Política Fiscal: El Gobierno y el Dinero",
          summary: "Cómo los gobiernos usan el gasto y los impuestos para moldear la economía — y por qué te afecta directamente.",
          audioUrl: null,
          blocks: [
            { type: "h2", text: "¿Qué es la política fiscal?" },
            { type: "p", text: "La política fiscal es el conjunto de decisiones del gobierno sobre cuánto recaudar en impuestos y cuánto gastar. Estas dos palancas —ingreso y gasto— moldean la velocidad de la economía." },
            { type: "h2", text: "Expansiva vs Contractiva" },
            { type: "p", text: "Cuando la economía está débil, el gobierno puede estimularla gastando más o reduciendo impuestos (política expansiva). Cuando la inflación es alta, puede hacer lo contrario: recortar gastos o aumentar impuestos (política contractiva)." },
            { type: "bullets", items: [
              "Gasto público: obras, salud, educación, transferencias — inyectan dinero en la economía",
              "Impuestos: retiran dinero de la circulación — frenan o estimulan sectores específicos",
              "Déficit fiscal: cuando el gobierno gasta más de lo que recauda — se financia con deuda"
            ]},
            { type: "h2", text: "El debate eterno: deuda pública" },
            { type: "p", text: "Los gobiernos frecuentemente gastan más de lo que recaudan, creando déficit y acumulando deuda. Los economistas debaten: ¿la deuda excesiva frena el crecimiento futuro o es un instrumento legítimo de desarrollo?" },
            { type: "quote", text: "A largo plazo, todos estaremos muertos. — John Maynard Keynes, defendiendo la acción fiscal a corto plazo" }
          ]
        },
        cards: [
          { id: "c1", front: "¿Qué es la política fiscal?", back: "Las decisiones del gobierno sobre recaudación de impuestos y nivel de gasto público para influir en la economía." },
          { id: "c2", front: "¿Qué es una política fiscal expansiva?", back: "Cuando el gobierno aumenta el gasto o reduce impuestos para estimular la economía — típicamente usada en recesiones." },
          { id: "c3", front: "¿Qué es un déficit fiscal?", back: "Cuando el gobierno gasta más de lo que recauda. La diferencia se cubre emitiendo deuda (bonos del gobierno)." },
          { id: "c4", front: "¿Cuál es la diferencia entre política fiscal y política monetaria?", back: "Fiscal: decisiones de gasto e impuestos (gobierno). Monetaria: decisiones sobre tasas de interés y oferta monetaria (banco central)." }
        ],
        quiz: [
          {
            id: "q1",
            question: "Un gobierno que aumenta el gasto en infraestructura durante una recesión está aplicando:",
            options: ["Política fiscal contractiva", "Política fiscal expansiva", "Política monetaria expansiva", "Austeridad fiscal"],
            answerIndex: 1,
            explanation: "Aumentar el gasto público inyecta dinero en la economía, estimulando la actividad — eso es política fiscal expansiva, típica en períodos de recesión."
          },
          {
            id: "q2",
            question: "El déficit fiscal ocurre cuando:",
            options: ["El banco central sube las tasas de interés", "El gobierno gasta más de lo que recauda en impuestos", "La inflación supera el crecimiento del PIB", "Las exportaciones superan las importaciones"],
            answerIndex: 1,
            explanation: "Déficit fiscal = gastos del gobierno > ingresos fiscales. La diferencia debe financiarse emitiendo deuda pública."
          },
          {
            id: "q3",
            question: "¿Qué institución es responsable de la política fiscal en un país?",
            options: ["Banco Central", "FMI", "Gobierno (Ejecutivo y Legislativo)", "Bolsa de valores"],
            answerIndex: 2,
            explanation: "La política fiscal la define el gobierno — el Ejecutivo propone el presupuesto y el Legislativo lo aprueba. El Banco Central gestiona la política monetaria de forma independiente."
          }
        ]
      }
    }
  },

  // ── foundations_decision_making ─────────────────────────────────────────────
  {
    id: "foundations_decision_making",
    version: 1,
    trackId: "foundations",
    order: 4,
    estimatedMinutes: 8,
    difficulty: 2,
    langs: {
      pt: {
        title: "Tomada de Decisão sob Incerteza",
        lesson: {
          title: "Tomada de Decisão sob Incerteza",
          summary: "Por que tomamos decisões ruins — e as ferramentas mentais para decidir melhor quando as respostas não são claras.",
          audioUrl: null,
          blocks: [
            { type: "h2", text: "O problema da incerteza" },
            { type: "p", text: "A maioria das decisões importantes da vida — carreira, investimentos, relacionamentos — acontece com informação incompleta. Esperar por certeza total é, em si, uma decisão." },
            { type: "h2", text: "Ferramentas para decidir melhor" },
            { type: "bullets", items: [
              "Análise de segunda ordem: não pergunte só 'o que acontece?', mas 'o que acontece depois que isso acontece?'",
              "Reversibilidade: decisões reversíveis merecem menos deliberação; as irreversíveis, mais cuidado",
              "Minimização de arrependimento: imagine-se aos 80 anos — qual escolha você vai lamentar menos?",
              "Pré-mortem: antes de decidir, imagine que o plano falhou — por quê?"
            ]},
            { type: "h2", text: "Velocidade vs precisão" },
            { type: "p", text: "Jeff Bezos classifica decisões em tipo 1 (irreversíveis, lentas) e tipo 2 (reversíveis, rápidas). O erro mais comum é tratar decisões tipo 2 como se fossem tipo 1 — isso paralisa organizações e pessoas." },
            { type: "quote", text: "Uma decisão boa tomada agora é melhor que uma decisão perfeita tomada tarde demais. — General George Patton" }
          ]
        },
        cards: [
          { id: "c1", front: "O que é 'análise de segunda ordem'?", back: "Pensar não só nas consequências imediatas de uma decisão, mas nas consequências das consequências." },
          { id: "c2", front: "O que é o 'pré-mortem'?", back: "Uma técnica em que você imagina que seu plano já falhou e tenta identificar por quê — antes de executar." },
          { id: "c3", front: "Qual a diferença entre decisões tipo 1 e tipo 2 (Bezos)?", back: "Tipo 1: irreversíveis, exigem cuidado e lentidão. Tipo 2: reversíveis, podem ser tomadas rápido e corrigidas depois." },
          { id: "c4", front: "O que é a 'minimização de arrependimento'?", back: "Um critério de decisão: escolher a opção que você vai se arrepender menos no futuro — útil quando os resultados são incertos." }
        ],
        quiz: [
          {
            id: "q1",
            question: "Qual técnica consiste em imaginar que um plano já falhou para identificar riscos?",
            options: ["Análise SWOT", "Pré-mortem", "Análise de segunda ordem", "Pensamento lateral"],
            answerIndex: 1,
            explanation: "O pré-mortem força você a pensar prospectivamente nos pontos de falha antes de executar um plano, aumentando a chance de sucesso ou alertando para riscos críticos."
          },
          {
            id: "q2",
            question: "Uma decisão 'reversível' deve ser tratada com:",
            options: ["Muita deliberação e lentidão", "Agilidade — se der errado, você corrige", "Consulta obrigatória a especialistas", "Evitação até que haja certeza total"],
            answerIndex: 1,
            explanation: "Decisões reversíveis (tipo 2) podem ser tomadas com agilidade. O custo de errar é baixo porque você pode corrigir. Tratá-las como irreversíveis desperdiça tempo e oportunidades."
          },
          {
            id: "q3",
            question: "A 'análise de segunda ordem' pergunta:",
            options: ["Qual é a probabilidade de sucesso?", "O que acontece depois que as consequências imediatas se desenrolam?", "Quem é responsável pela decisão?", "Qual é o custo financeiro da escolha?"],
            answerIndex: 1,
            explanation: "Analisar apenas as consequências imediatas é pensar de primeira ordem. A segunda ordem vai além: o que acontece depois? Essa visão evita soluções que criam novos problemas."
          }
        ]
      },
      en: {
        title: "Decision Making Under Uncertainty",
        lesson: {
          title: "Decision Making Under Uncertainty",
          summary: "Why we make poor decisions — and the mental tools to decide better when answers aren't clear.",
          audioUrl: null,
          blocks: [
            { type: "h2", text: "The problem of uncertainty" },
            { type: "p", text: "Most important life decisions — career, investments, relationships — happen with incomplete information. Waiting for total certainty is itself a decision." },
            { type: "h2", text: "Tools for better decisions" },
            { type: "bullets", items: [
              "Second-order thinking: don't just ask 'what happens?' but 'what happens after that happens?'",
              "Reversibility: reversible decisions deserve less deliberation; irreversible ones deserve more care",
              "Regret minimization: imagine yourself at 80 — which choice will you regret least?",
              "Pre-mortem: before deciding, imagine the plan has already failed — why did it?"
            ]},
            { type: "h2", text: "Speed vs precision" },
            { type: "p", text: "Jeff Bezos classifies decisions into type 1 (irreversible, slow) and type 2 (reversible, fast). The most common mistake is treating type 2 decisions as if they were type 1 — this paralyzes organizations and individuals." },
            { type: "quote", text: "A good plan executed now is better than a perfect plan executed too late. — General George Patton" }
          ]
        },
        cards: [
          { id: "c1", front: "What is 'second-order thinking'?", back: "Thinking not just about the immediate consequences of a decision, but about the consequences of those consequences." },
          { id: "c2", front: "What is a 'pre-mortem'?", back: "A technique where you imagine your plan has already failed and try to identify why — before executing it." },
          { id: "c3", front: "What is the difference between type 1 and type 2 decisions (Bezos)?", back: "Type 1: irreversible, require care and deliberation. Type 2: reversible, can be made quickly and corrected later." },
          { id: "c4", front: "What is 'regret minimization'?", back: "A decision criterion: choose the option you'll regret least in the future — useful when outcomes are uncertain." }
        ],
        quiz: [
          {
            id: "q1",
            question: "Which technique involves imagining a plan has already failed to identify risks?",
            options: ["SWOT analysis", "Pre-mortem", "Second-order thinking", "Lateral thinking"],
            answerIndex: 1,
            explanation: "The pre-mortem forces you to think prospectively about failure points before executing a plan, increasing the chance of success or alerting you to critical risks."
          },
          {
            id: "q2",
            question: "A 'reversible' decision should be treated with:",
            options: ["Much deliberation and slowness", "Agility — if it goes wrong, you correct it", "Mandatory expert consultation", "Avoidance until there is total certainty"],
            answerIndex: 1,
            explanation: "Reversible decisions (type 2) can be made with agility. The cost of being wrong is low because you can correct course. Treating them as irreversible wastes time and opportunities."
          },
          {
            id: "q3",
            question: "'Second-order thinking' asks:",
            options: ["What is the probability of success?", "What happens after the immediate consequences unfold?", "Who is responsible for the decision?", "What is the financial cost of the choice?"],
            answerIndex: 1,
            explanation: "Analyzing only immediate consequences is first-order thinking. Second order goes further: what happens next? This vision avoids solutions that create new problems."
          }
        ]
      },
      es: {
        title: "Toma de Decisiones bajo Incertidumbre",
        lesson: {
          title: "Toma de Decisiones bajo Incertidumbre",
          summary: "Por qué tomamos malas decisiones — y las herramientas mentales para decidir mejor cuando las respuestas no son claras.",
          audioUrl: null,
          blocks: [
            { type: "h2", text: "El problema de la incertidumbre" },
            { type: "p", text: "La mayoría de las decisiones importantes de la vida —carrera, inversiones, relaciones— ocurren con información incompleta. Esperar la certeza total es, en sí mismo, una decisión." },
            { type: "h2", text: "Herramientas para decidir mejor" },
            { type: "bullets", items: [
              "Pensamiento de segundo orden: no preguntes solo '¿qué pasa?', sino '¿qué pasa después de que eso pasa?'",
              "Reversibilidad: las decisiones reversibles merecen menos deliberación; las irreversibles, más cuidado",
              "Minimización del arrepentimiento: imagínate a los 80 años — ¿qué elección lamentarás menos?",
              "Pre-mortem: antes de decidir, imagina que el plan ya fracasó — ¿por qué?"
            ]},
            { type: "h2", text: "Velocidad vs precisión" },
            { type: "p", text: "Jeff Bezos clasifica las decisiones en tipo 1 (irreversibles, lentas) y tipo 2 (reversibles, rápidas). El error más común es tratar las decisiones tipo 2 como si fueran tipo 1 — esto paraliza organizaciones y personas." },
            { type: "quote", text: "Un buen plan ejecutado ahora es mejor que un plan perfecto ejecutado demasiado tarde. — General George Patton" }
          ]
        },
        cards: [
          { id: "c1", front: "¿Qué es el 'pensamiento de segundo orden'?", back: "Pensar no solo en las consecuencias inmediatas de una decisión, sino en las consecuencias de esas consecuencias." },
          { id: "c2", front: "¿Qué es un 'pre-mortem'?", back: "Una técnica en la que imaginas que tu plan ya fracasó e intentas identificar por qué — antes de ejecutarlo." },
          { id: "c3", front: "¿Cuál es la diferencia entre decisiones tipo 1 y tipo 2 (Bezos)?", back: "Tipo 1: irreversibles, requieren cuidado y deliberación. Tipo 2: reversibles, pueden tomarse rápido y corregirse después." },
          { id: "c4", front: "¿Qué es la 'minimización del arrepentimiento'?", back: "Un criterio de decisión: elegir la opción de la que te arrepentirás menos en el futuro — útil cuando los resultados son inciertos." }
        ],
        quiz: [
          {
            id: "q1",
            question: "¿Qué técnica consiste en imaginar que un plan ya fracasó para identificar riesgos?",
            options: ["Análisis DAFO", "Pre-mortem", "Pensamiento de segundo orden", "Pensamiento lateral"],
            answerIndex: 1,
            explanation: "El pre-mortem te obliga a pensar prospectivamente en los puntos de falla antes de ejecutar un plan, aumentando la probabilidad de éxito o alertando sobre riesgos críticos."
          },
          {
            id: "q2",
            question: "Una decisión 'reversible' debe tratarse con:",
            options: ["Mucha deliberación y lentitud", "Agilidad — si sale mal, la corriges", "Consulta obligatoria a expertos", "Evitación hasta tener certeza total"],
            answerIndex: 1,
            explanation: "Las decisiones reversibles (tipo 2) pueden tomarse con agilidad. El costo de equivocarse es bajo porque puedes corregir el rumbo. Tratarlas como irreversibles desperdicia tiempo y oportunidades."
          },
          {
            id: "q3",
            question: "El 'pensamiento de segundo orden' pregunta:",
            options: ["¿Cuál es la probabilidad de éxito?", "¿Qué pasa después de que se desarrollan las consecuencias inmediatas?", "¿Quién es responsable de la decisión?", "¿Cuál es el costo financiero de la elección?"],
            answerIndex: 1,
            explanation: "Analizar solo las consecuencias inmediatas es pensamiento de primer orden. El segundo orden va más allá: ¿qué pasa después? Esta visión evita soluciones que crean nuevos problemas."
          }
        ]
      }
    }
  }
];

// ─── UPLOAD ───────────────────────────────────────────────────────────────────

async function uploadPack(packDef, lang, langData) {
  const pack = {
    id: packDef.id,
    version: packDef.version,
    lang,
    estimatedMinutes: packDef.estimatedMinutes,
    difficulty: packDef.difficulty,
    tags: [packDef.trackId, packDef.id],
    source: "remote",
    lesson: langData.lesson,
    cards: langData.cards,
    quiz: langData.quiz,
  };

  const storagePath = `packs/${packDef.id}/v${packDef.version}/${lang}.json`;
  const file = bucket.file(storagePath);
  const content = JSON.stringify(pack, null, 2);

  await file.save(content, {
    contentType: "application/json",
    metadata: { cacheControl: "public, max-age=86400" },
  });

  console.log(`  ✓ Uploaded ${storagePath}`);
}

async function registerLesson(packDef) {
  const titles = {};
  for (const [lang, data] of Object.entries(packDef.langs)) {
    titles[lang] = data.title;
  }

  await db.collection("lessons").doc(packDef.id).set({
    trackId: packDef.trackId,
    version: packDef.version,
    order: packDef.order,
    title: titles,
    estimatedMinutes: packDef.estimatedMinutes,
    difficulty: packDef.difficulty,
  });

  console.log(`  ✓ Registered lesson metadata: ${packDef.id}`);
}

async function main() {
  console.log(`\nLumen — Generating ${PACKS.length} packs (${PACKS.length * 3} files)\n`);

  for (const packDef of PACKS) {
    console.log(`\n[${packDef.id}]`);

    for (const [lang, langData] of Object.entries(packDef.langs)) {
      await uploadPack(packDef, lang, langData);
    }

    await registerLesson(packDef);
  }

  console.log("\n✅ Done. All packs uploaded and registered in Firestore.\n");
}

main().catch((err) => {
  console.error("Error:", err);
  process.exit(1);
});
