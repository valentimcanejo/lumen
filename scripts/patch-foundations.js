/**
 * patch-foundations.js
 * Patches foundations track packs to have 5 cards + 5 quiz each.
 * Also uploads the missing foundations_decision_making pack.
 *
 * node scripts/patch-foundations.js
 */
const admin = require("firebase-admin");
const path = require("path");
const serviceAccount = require(path.join(__dirname, "serviceAccountKey.json"));

admin.initializeApp({
  credential: admin.credential.cert(serviceAccount),
  storageBucket: "lumen-13d0d.firebasestorage.app",
});
const db = admin.firestore();
const bucket = admin.storage().bucket();

// ─── PATCHES (c4, c5, q3, q4, q5 for existing packs) ─────────────────────────

const PATCHES = {

  // ── foundations (Pensamento Sistêmico) ──────────────────────────────────────
  foundations: {
    pt: {
      cards: [
        { id: "c4", front: "O que é um ponto de alavancagem em um sistema?", back: "Um lugar onde uma pequena intervenção pode gerar grandes mudanças. Identificá-lo é mais eficaz do que forçar mudanças em partes sem influência." },
        { id: "c5", front: "O que é emergência em sistemas complexos?", back: "Propriedades que surgem da interação entre partes e não existem nas partes isoladas. Ex: consciência no cérebro, mercado na economia." },
      ],
      quiz: [
        { id: "q3", question: "Por que focar em pontos de alavancagem é mais eficaz do que mudar várias partes de um sistema?", options: ["Porque os pontos de alavancagem são sempre visíveis e fáceis de identificar","Porque pequenas mudanças nesses pontos geram efeitos desproporcionalmente grandes no sistema","Porque elimina a necessidade de entender o sistema como um todo","Porque reduz o número de variáveis do sistema"], answerIndex: 1, explanation: "Pontos de alavancagem são locais onde intervenções mínimas produzem máximo impacto. Identificá-los exige entender a estrutura do sistema, não apenas seus sintomas." },
        { id: "q4", question: "O que é uma propriedade emergente em um sistema?", options: ["Uma propriedade planejada pelos designers do sistema","Uma propriedade que existe em cada parte individual","Uma propriedade que surge apenas da interação entre as partes","Uma falha inesperada do sistema"], answerIndex: 2, explanation: "Emergência ocorre quando a interação entre componentes cria algo que não existe nos componentes individualmente — como a liquidez da água emergindo de moléculas H₂O." },
        { id: "q5", question: "Qual a consequência de intervir num sistema complexo sem entender sua estrutura?", options: ["Geralmente gera melhorias rápidas e duradouras","Pode resolver o problema mas criar efeitos colaterais inesperados ou piorar o sistema","Não tem consequências além do ponto de intervenção","Sempre estabiliza o sistema no longo prazo"], answerIndex: 1, explanation: "Intervenções sem visão sistêmica frequentemente atacam sintomas sem mudar a estrutura causal, gerando efeitos colaterais ou fazendo o problema ressurgir mais forte." },
      ],
    },
    en: {
      cards: [
        { id: "c4", front: "What is a leverage point in a system?", back: "A place where a small intervention can produce large changes. Finding it is more effective than forcing changes in low-influence parts." },
        { id: "c5", front: "What is emergence in complex systems?", back: "Properties that arise from the interaction between parts and don't exist in isolated parts. E.g.: consciousness in the brain, markets in an economy." },
      ],
      quiz: [
        { id: "q3", question: "Why is focusing on leverage points more effective than changing many parts of a system?", options: ["Because leverage points are always visible and easy to identify","Because small changes there produce disproportionately large effects on the system","Because it eliminates the need to understand the system as a whole","Because it reduces the number of variables in the system"], answerIndex: 1, explanation: "Leverage points are locations where minimal interventions produce maximum impact. Identifying them requires understanding the system's structure, not just its symptoms." },
        { id: "q4", question: "What is an emergent property in a system?", options: ["A property planned by the system's designers","A property that exists in each individual part","A property that arises only from the interaction between parts","An unexpected system failure"], answerIndex: 2, explanation: "Emergence occurs when the interaction between components creates something that doesn't exist in the components individually — like the liquidity of water emerging from H₂O molecules." },
        { id: "q5", question: "What happens when you intervene in a complex system without understanding its structure?", options: ["Usually generates quick and lasting improvements","May solve the problem but create unexpected side effects or worsen the system","Has no consequences beyond the point of intervention","Always stabilizes the system in the long run"], answerIndex: 1, explanation: "Interventions without systemic vision often attack symptoms without changing the causal structure, generating side effects or causing the problem to resurface even stronger." },
      ],
    },
    es: {
      cards: [
        { id: "c4", front: "¿Qué es un punto de apalancamiento en un sistema?", back: "Un lugar donde una pequeña intervención puede generar grandes cambios. Identificarlo es más efectivo que forzar cambios en partes sin influencia." },
        { id: "c5", front: "¿Qué es la emergencia en sistemas complejos?", back: "Propiedades que surgen de la interacción entre partes y no existen en las partes aisladas. Ej: conciencia en el cerebro, mercado en la economía." },
      ],
      quiz: [
        { id: "q3", question: "¿Por qué enfocarse en puntos de apalancamiento es más efectivo que cambiar varias partes de un sistema?", options: ["Porque los puntos de apalancamiento son siempre visibles y fáciles de identificar","Porque pequeños cambios en esos puntos generan efectos desproporcionalmente grandes en el sistema","Porque elimina la necesidad de entender el sistema como un todo","Porque reduce el número de variables del sistema"], answerIndex: 1, explanation: "Los puntos de apalancamiento son lugares donde intervenciones mínimas producen máximo impacto. Identificarlos requiere entender la estructura del sistema, no solo sus síntomas." },
        { id: "q4", question: "¿Qué es una propiedad emergente en un sistema?", options: ["Una propiedad planificada por los diseñadores del sistema","Una propiedad que existe en cada parte individual","Una propiedad que surge solo de la interacción entre las partes","Un fallo inesperado del sistema"], answerIndex: 2, explanation: "La emergencia ocurre cuando la interacción entre componentes crea algo que no existe en los componentes individualmente — como la liquidez del agua emergiendo de moléculas H₂O." },
        { id: "q5", question: "¿Qué consecuencia tiene intervenir en un sistema complejo sin entender su estructura?", options: ["Generalmente genera mejoras rápidas y duraderas","Puede resolver el problema pero crear efectos secundarios inesperados o empeorar el sistema","No tiene consecuencias más allá del punto de intervención","Siempre estabiliza el sistema a largo plazo"], answerIndex: 1, explanation: "Las intervenciones sin visión sistémica frecuentemente atacan síntomas sin cambiar la estructura causal, generando efectos secundarios o haciendo que el problema resurja más fuerte." },
      ],
    },
  },

  // ── foundations_mental_models ───────────────────────────────────────────────
  foundations_mental_models: {
    pt: {
      cards: [
        { id: "c4", front: "O que é o Princípio de Pareto (80/20)?", back: "A observação de que ~80% dos resultados vêm de ~20% das causas. Útil para identificar onde concentrar esforço e eliminar o que gera pouco retorno." },
        { id: "c5", front: "O que é inversão como modelo mental?", back: "Pensar ao contrário: em vez de 'como alcanço sucesso?', perguntar 'o que me faria falhar?'. Identificar e evitar o negativo costuma ser mais poderoso do que perseguir o positivo." },
      ],
      quiz: [
        { id: "q3", question: "O que a Navalha de Occam recomenda quando há duas explicações igualmente válidas?", options: ["Escolher a mais elaborada, pois provavelmente considera mais fatores","Escolher a mais simples, evitando complexidade desnecessária","Suspender o julgamento até ter mais dados","Combinar as duas explicações em uma terceira"], answerIndex: 1, explanation: "Occam's Razor prefere a explicação mais simples porque complexidade desnecessária aumenta a chance de erro. Entidades não devem ser multiplicadas além do necessário." },
        { id: "q4", question: "Qual é a principal utilidade do Princípio de Pareto no dia a dia?", options: ["Provar que toda distribuição é exatamente 80/20","Identificar as poucas causas que geram a maioria dos resultados","Distribuir esforço igualmente entre todas as tarefas","Ignorar os 80% de causas que geram menos resultados"], answerIndex: 1, explanation: "O 80/20 ajuda a priorizar: ao focar nos ~20% de inputs que geram ~80% dos outputs, você maximiza impacto sem aumentar esforço total." },
        { id: "q5", question: "Por que o modelo mental de inversão é poderoso?", options: ["Porque sempre leva à solução oposta do problema","Porque evitar falhas sistemáticas costuma ser mais confiável do que perseguir sucesso","Porque inverte a causa e o efeito em sistemas complexos","Porque elimina a necessidade de estabelecer metas positivas"], answerIndex: 1, explanation: "Pensar 'o que me faria falhar?' e eliminar esses elementos é muitas vezes mais robusto do que apenas perseguir o sucesso — é a base do pré-mortem e do investimento defensivo." },
      ],
    },
    en: {
      cards: [
        { id: "c4", front: "What is the Pareto Principle (80/20)?", back: "The observation that ~80% of results come from ~20% of causes. Useful for identifying where to focus effort and eliminate low-return activities." },
        { id: "c5", front: "What is inversion as a mental model?", back: "Thinking backwards: instead of 'how do I succeed?', ask 'what would make me fail?'. Identifying and avoiding the negative is often more powerful than chasing the positive." },
      ],
      quiz: [
        { id: "q3", question: "What does Occam's Razor recommend when two explanations are equally valid?", options: ["Choose the more elaborate one, as it likely accounts for more factors","Choose the simpler one, avoiding unnecessary complexity","Suspend judgment until more data is available","Combine both explanations into a third"], answerIndex: 1, explanation: "Occam's Razor prefers the simpler explanation because unnecessary complexity increases the chance of error. Entities should not be multiplied beyond necessity." },
        { id: "q4", question: "What is the main practical use of the Pareto Principle?", options: ["Proving that every distribution is exactly 80/20","Identifying the few causes that generate most results","Distributing effort equally across all tasks","Ignoring the 80% of causes that generate fewer results"], answerIndex: 1, explanation: "The 80/20 rule helps prioritize: by focusing on the ~20% of inputs generating ~80% of outputs, you maximize impact without increasing total effort." },
        { id: "q5", question: "Why is the inversion mental model powerful?", options: ["Because it always leads to the opposite solution","Because systematically avoiding failures is often more reliable than chasing success","Because it reverses cause and effect in complex systems","Because it eliminates the need to set positive goals"], answerIndex: 1, explanation: "Thinking 'what would make me fail?' and eliminating those elements is often more robust than merely pursuing success — it's the foundation of pre-mortems and defensive investing." },
      ],
    },
    es: {
      cards: [
        { id: "c4", front: "¿Qué es el Principio de Pareto (80/20)?", back: "La observación de que ~80% de los resultados provienen de ~20% de las causas. Útil para identificar dónde concentrar esfuerzo y eliminar lo que genera poco retorno." },
        { id: "c5", front: "¿Qué es la inversión como modelo mental?", back: "Pensar al revés: en lugar de '¿cómo logro el éxito?', preguntar '¿qué me haría fracasar?'. Identificar y evitar lo negativo suele ser más poderoso que perseguir lo positivo." },
      ],
      quiz: [
        { id: "q3", question: "¿Qué recomienda la Navaja de Occam cuando hay dos explicaciones igualmente válidas?", options: ["Elegir la más elaborada, ya que probablemente considera más factores","Elegir la más simple, evitando complejidad innecesaria","Suspender el juicio hasta tener más datos","Combinar las dos explicaciones en una tercera"], answerIndex: 1, explanation: "La Navaja de Occam prefiere la explicación más simple porque la complejidad innecesaria aumenta la probabilidad de error. Las entidades no deben multiplicarse más allá de lo necesario." },
        { id: "q4", question: "¿Cuál es la principal utilidad del Principio de Pareto en el día a día?", options: ["Probar que toda distribución es exactamente 80/20","Identificar las pocas causas que generan la mayoría de los resultados","Distribuir el esfuerzo igualmente entre todas las tareas","Ignorar el 80% de causas que generan menos resultados"], answerIndex: 1, explanation: "El 80/20 ayuda a priorizar: al enfocarse en el ~20% de inputs que generan ~80% de los outputs, maximizas el impacto sin aumentar el esfuerzo total." },
        { id: "q5", question: "¿Por qué el modelo mental de inversión es poderoso?", options: ["Porque siempre lleva a la solución opuesta del problema","Porque evitar fallos sistemáticos suele ser más confiable que perseguir el éxito","Porque invierte la causa y el efecto en sistemas complejos","Porque elimina la necesidad de establecer metas positivas"], answerIndex: 1, explanation: "Pensar '¿qué me haría fracasar?' y eliminar esos elementos es frecuentemente más robusto que solo perseguir el éxito — es la base del pre-mortem y la inversión defensiva." },
      ],
    },
  },

  // ── foundations_first_principles ────────────────────────────────────────────
  foundations_first_principles: {
    pt: {
      cards: [
        { id: "c4", front: "Como Elon Musk aplicou primeiros princípios na SpaceX?", back: "Em vez de aceitar que foguetes custam $200M, ele perguntou: quais materiais compõem um foguete e quanto custam? Chegou a 2% do preço de mercado e construiu do zero." },
        { id: "c5", front: "Qual é o papel da maiêutica socrática no raciocínio por primeiros princípios?", back: "Sócrates usava perguntas sucessivas para revelar suposições ocultas e chegar a verdades fundamentais — o mesmo método de questionar 'por quê?' até não restar premissas aceitas sem prova." },
      ],
      quiz: [
        { id: "q3", question: "Por que questionar suposições é o primeiro passo no raciocínio por primeiros princípios?", options: ["Porque suposições são sempre falsas e devem ser descartadas","Porque muitas crenças aceitas como fatos são convenções ou analogias sem fundamento verificado","Porque elimina a necessidade de dados empíricos","Porque acelera o processo de tomada de decisão"], answerIndex: 1, explanation: "Suposições não examinadas limitam as soluções possíveis. Ao questioná-las, você pode descobrir que restrições que parecem físicas são apenas convenções históricas." },
        { id: "q4", question: "O que diferencia primeiros princípios de 'best practices' do setor?", options: ["Primeiros princípios são mais rápidos de aplicar","Best practices são baseadas em dados, primeiros princípios não","Best practices copiam o que funcionou antes; primeiros princípios questionam se o que funcionou antes é de fato ótimo","Primeiros princípios são usados apenas em engenharia"], answerIndex: 2, explanation: "Best practices são eficientes para otimização incremental, mas encurtam a busca por soluções radicalmente diferentes. Primeiros princípios abrem o espaço de possibilidades ao remover esse viés." },
        { id: "q5", question: "Em qual situação primeiros princípios é mais valioso do que raciocínio por analogia?", options: ["Quando você quer uma solução rápida e de baixo risco","Quando o problema é novo, as soluções existentes são inadequadas ou o custo de inovar é justificável","Quando existem muitas referências de como outros resolveram o problema","Quando o tempo disponível é muito curto para análise profunda"], answerIndex: 1, explanation: "Primeiros princípios tem custo cognitivo alto. Compensa quando o problema é inédito, quando as soluções atuais são claramente insuficientes ou quando a inovação radical tem alto potencial de retorno." },
      ],
    },
    en: {
      cards: [
        { id: "c4", front: "How did Elon Musk apply first principles at SpaceX?", back: "Instead of accepting that rockets cost $200M, he asked: what materials make up a rocket and what do they cost? He arrived at 2% of market price and built from scratch." },
        { id: "c5", front: "What role does Socratic maieutics play in first principles reasoning?", back: "Socrates used successive questions to reveal hidden assumptions and reach fundamental truths — the same method of asking 'why?' until no unproven premises remain." },
      ],
      quiz: [
        { id: "q3", question: "Why is questioning assumptions the first step in first principles reasoning?", options: ["Because assumptions are always false and should be discarded","Because many beliefs accepted as facts are conventions or analogies without verified foundation","Because it eliminates the need for empirical data","Because it speeds up decision-making"], answerIndex: 1, explanation: "Unexamined assumptions limit the solution space. By questioning them, you may discover that constraints that seem physical are merely historical conventions." },
        { id: "q4", question: "What distinguishes first principles from industry 'best practices'?", options: ["First principles are faster to apply","Best practices are data-based, first principles are not","Best practices copy what worked before; first principles question whether what worked before is truly optimal","First principles are only used in engineering"], answerIndex: 2, explanation: "Best practices are efficient for incremental optimization but narrow the search for radically different solutions. First principles open the solution space by removing that bias." },
        { id: "q5", question: "In which situation is first principles more valuable than reasoning by analogy?", options: ["When you want a quick, low-risk solution","When the problem is new, existing solutions are inadequate, or the cost of innovating is justifiable","When there are many references to how others solved the problem","When available time is too short for deep analysis"], answerIndex: 1, explanation: "First principles has a high cognitive cost. It pays off when the problem is novel, when current solutions are clearly insufficient, or when radical innovation has high return potential." },
      ],
    },
    es: {
      cards: [
        { id: "c4", front: "¿Cómo aplicó Elon Musk los primeros principios en SpaceX?", back: "En lugar de aceptar que los cohetes cuestan $200M, preguntó: ¿qué materiales componen un cohete y cuánto cuestan? Llegó al 2% del precio de mercado y construyó desde cero." },
        { id: "c5", front: "¿Qué papel juega la mayéutica socrática en el razonamiento por primeros principios?", back: "Sócrates usaba preguntas sucesivas para revelar suposiciones ocultas y llegar a verdades fundamentales — el mismo método de preguntar '¿por qué?' hasta que no queden premisas aceptadas sin prueba." },
      ],
      quiz: [
        { id: "q3", question: "¿Por qué cuestionar suposiciones es el primer paso en el razonamiento por primeros principios?", options: ["Porque las suposiciones son siempre falsas y deben descartarse","Porque muchas creencias aceptadas como hechos son convenciones o analogías sin fundamento verificado","Porque elimina la necesidad de datos empíricos","Porque acelera el proceso de toma de decisiones"], answerIndex: 1, explanation: "Las suposiciones no examinadas limitan las soluciones posibles. Al cuestionarlas, puedes descubrir que restricciones que parecen físicas son solo convenciones históricas." },
        { id: "q4", question: "¿Qué diferencia los primeros principios de las 'best practices' del sector?", options: ["Los primeros principios son más rápidos de aplicar","Las best practices se basan en datos; los primeros principios no","Las best practices copian lo que funcionó antes; los primeros principios cuestionan si lo que funcionó antes es realmente óptimo","Los primeros principios se usan solo en ingeniería"], answerIndex: 2, explanation: "Las best practices son eficientes para la optimización incremental, pero reducen la búsqueda de soluciones radicalmente diferentes. Los primeros principios abren el espacio de posibilidades eliminando ese sesgo." },
        { id: "q5", question: "¿En qué situación los primeros principios son más valiosos que el razonamiento por analogía?", options: ["Cuando quieres una solución rápida y de bajo riesgo","Cuando el problema es nuevo, las soluciones existentes son inadecuadas o el costo de innovar es justificable","Cuando hay muchas referencias de cómo otros resolvieron el problema","Cuando el tiempo disponible es muy corto para un análisis profundo"], answerIndex: 1, explanation: "Los primeros principios tienen un alto costo cognitivo. Compensa cuando el problema es inédito, cuando las soluciones actuales son claramente insuficientes o cuando la innovación radical tiene alto potencial de retorno." },
      ],
    },
  },

  // ── foundations_probabilistic ────────────────────────────────────────────────
  foundations_probabilistic: {
    pt: {
      cards: [
        { id: "c4", front: "O que é a heurística de disponibilidade e por que distorce probabilidades?", back: "Tendência de julgar a probabilidade de um evento pela facilidade com que exemplos vêm à mente. Eventos vívidos ou recentes parecem mais prováveis do que realmente são." },
        { id: "c5", front: "O que é margem de segurança no pensamento probabilístico?", back: "Assumir que suas estimativas têm erro e planejar com folga. Se você acha que algo vai demorar 10 dias, planeje para 14 — incerteza real é quase sempre maior do que a estimada." },
      ],
      quiz: [
        { id: "q3", question: "O que é atualização bayesiana?", options: ["Calcular a probabilidade de um evento sem considerar evidências anteriores","Revisar suas crenças à medida que novas evidências chegam, combinando prior com likelihood","Substituir dados reais por estimativas subjetivas","Ignorar a taxa base e focar apenas em evidências recentes"], answerIndex: 1, explanation: "Bayes nos diz que a probabilidade posterior é proporcional ao prior multiplicado pela verossimilhança da evidência. Atualizar continuamente é mais preciso do que fazer uma estimativa única." },
        { id: "q4", question: "Por que a heurística de disponibilidade pode ser enganosa?", options: ["Porque leva sempre à subestimação de riscos","Porque a facilidade de recordar algo não reflete sua probabilidade real","Porque ignora totalmente a taxa base","Porque funciona apenas para eventos raros"], answerIndex: 1, explanation: "Acidentes de avião são lembrados mais facilmente do que acidentes de carro, mas carros são muito mais perigosos estatisticamente. A disponibilidade mental não é um proxy confiável de probabilidade." },
        { id: "q5", question: "Qual é a função da margem de segurança em estimativas incertas?", options: ["Eliminar toda a incerteza do planejamento","Garantir que o resultado sempre supere as expectativas","Compensar o fato de que subestimamos sistematicamente o tempo, custo e risco","Tornar o plano mais conservador do que o necessário"], answerIndex: 2, explanation: "A Lei de Hofstadter diz que tudo leva mais tempo do que o esperado, mesmo quando consideramos isso. Margens de segurança compensam esse viés sistemático de otimismo nas estimativas." },
      ],
    },
    en: {
      cards: [
        { id: "c4", front: "What is the availability heuristic and why does it distort probabilities?", back: "The tendency to judge the probability of an event by how easily examples come to mind. Vivid or recent events seem more likely than they actually are." },
        { id: "c5", front: "What is margin of safety in probabilistic thinking?", back: "Assuming your estimates have error and planning with slack. If you think something will take 10 days, plan for 14 — real uncertainty is almost always greater than estimated." },
      ],
      quiz: [
        { id: "q3", question: "What is Bayesian updating?", options: ["Calculating the probability of an event without considering prior evidence","Revising your beliefs as new evidence arrives, combining prior with likelihood","Replacing real data with subjective estimates","Ignoring base rates and focusing only on recent evidence"], answerIndex: 1, explanation: "Bayes tells us that posterior probability is proportional to prior multiplied by the likelihood of evidence. Continuously updating is more accurate than making a single estimate." },
        { id: "q4", question: "Why can the availability heuristic be misleading?", options: ["Because it always leads to underestimating risks","Because ease of recall doesn't reflect actual probability","Because it completely ignores base rates","Because it only works for rare events"], answerIndex: 1, explanation: "Plane crashes are more easily recalled than car accidents, but cars are statistically far more dangerous. Mental availability is not a reliable proxy for probability." },
        { id: "q5", question: "What is the function of a margin of safety in uncertain estimates?", options: ["To eliminate all uncertainty from planning","To ensure the outcome always exceeds expectations","To compensate for the fact that we systematically underestimate time, cost and risk","To make the plan more conservative than necessary"], answerIndex: 2, explanation: "Hofstadter's Law states that everything takes longer than expected, even when you account for this. Safety margins compensate for this systematic optimism bias in estimates." },
      ],
    },
    es: {
      cards: [
        { id: "c4", front: "¿Qué es la heurística de disponibilidad y por qué distorsiona las probabilidades?", back: "La tendencia a juzgar la probabilidad de un evento por la facilidad con que vienen ejemplos a la mente. Los eventos vívidos o recientes parecen más probables de lo que realmente son." },
        { id: "c5", front: "¿Qué es el margen de seguridad en el pensamiento probabilístico?", back: "Asumir que tus estimaciones tienen error y planificar con holgura. Si crees que algo tomará 10 días, planifica para 14 — la incertidumbre real casi siempre es mayor que la estimada." },
      ],
      quiz: [
        { id: "q3", question: "¿Qué es la actualización bayesiana?", options: ["Calcular la probabilidad de un evento sin considerar evidencias anteriores","Revisar tus creencias a medida que llegan nuevas evidencias, combinando prior con likelihood","Reemplazar datos reales por estimaciones subjetivas","Ignorar la tasa base y enfocarse solo en evidencias recientes"], answerIndex: 1, explanation: "Bayes nos dice que la probabilidad posterior es proporcional al prior multiplicado por la verosimilitud de la evidencia. Actualizar continuamente es más preciso que hacer una estimación única." },
        { id: "q4", question: "¿Por qué la heurística de disponibilidad puede ser engañosa?", options: ["Porque siempre lleva a subestimar riesgos","Porque la facilidad de recordar algo no refleja su probabilidad real","Porque ignora completamente la tasa base","Porque solo funciona para eventos raros"], answerIndex: 1, explanation: "Los accidentes de avión se recuerdan más fácilmente que los de automóvil, pero los autos son estadísticamente mucho más peligrosos. La disponibilidad mental no es un proxy confiable de probabilidad." },
        { id: "q5", question: "¿Cuál es la función del margen de seguridad en estimaciones inciertas?", options: ["Eliminar toda la incertidumbre de la planificación","Garantizar que el resultado siempre supere las expectativas","Compensar el hecho de que subestimamos sistemáticamente el tiempo, costo y riesgo","Hacer el plan más conservador de lo necesario"], answerIndex: 2, explanation: "La Ley de Hofstadter dice que todo tarda más de lo esperado, incluso cuando lo tenemos en cuenta. Los márgenes de seguridad compensan este sesgo sistemático de optimismo en las estimaciones." },
      ],
    },
  },
};

// ─── MISSING PACK: foundations_decision_making ────────────────────────────────

const MISSING_PACKS = [
  {
    id: "foundations_decision_making",
    version: 1,
    trackId: "foundations",
    order: 4,
    estimatedMinutes: 10,
    difficulty: 2,
    langs: {
      pt: {
        title: "Tomada de Decisão sob Incerteza",
        lesson: {
          title: "Tomada de Decisão sob Incerteza",
          summary: "A maioria das decisões importantes é tomada com informação incompleta. Entender como pensar bem sob incerteza é uma das habilidades mais valiosas que existem.",
          audioUrl: null,
          blocks: [
            { type: "h2", text: "Por que decidir é difícil?" },
            { type: "p", text: "Decidir seria simples se tivéssemos todas as informações. O problema é que quase nunca temos. Decisões importantes — carreira, negócios, investimentos, relacionamentos — ocorrem sob incerteza fundamental." },
            { type: "p", text: "A armadilha é esperar por certeza antes de agir. Quem espera por certeza não decide — escolhe a inação, que também é uma decisão com suas próprias consequências." },
            { type: "h2", text: "Qualidade da decisão vs. resultado" },
            { type: "p", text: "Um erro comum é julgar decisões pelos resultados. Uma aposta boa pode dar errado; uma aposta ruim pode dar certo por sorte. O que você controla é a qualidade do processo de decisão, não o resultado." },
            { type: "bullets", items: [
              "Boa decisão + bom resultado: sorte confirmando bom processo",
              "Boa decisão + mau resultado: azar — o processo ainda era correto",
              "Má decisão + bom resultado: sorte disfarçada de competência",
              "Má decisão + mau resultado: consequência esperada",
            ]},
            { type: "h2", text: "Ferramentas para decidir melhor" },
            { type: "p", text: "Pré-mortem: imagine que sua decisão falhou. O que causou a falha? Isso revela riscos que o otimismo natural esconde. Análise de arrependimento: qual decisão você vai se arrepender menos daqui a 10 anos?" },
            { type: "quote", text: "Você não pode controlar o resultado. Pode controlar o processo. Julgue-se pelo processo. — Annie Duke" },
          ],
        },
        cards: [
          { id: "c1", front: "Por que julgar uma decisão pelo resultado é um erro?", back: "Porque resultados têm componente de sorte. Uma decisão ruim pode dar certo por acaso; uma ótima pode dar errado. O que importa é a qualidade do processo de decisão." },
          { id: "c2", front: "O que é um pré-mortem?", back: "Técnica em que você imagina que sua decisão já falhou e trabalha de trás para frente para identificar o que causou o fracasso — revelando riscos que o otimismo natural oculta." },
          { id: "c3", front: "O que é a análise de arrependimento de Jeff Bezos?", back: "Projetar-se aos 80 anos e perguntar: 'Vou me arrepender de não ter tentado isso?' Se a resposta for sim, o risco de tentar é menor do que o risco de não tentar." },
          { id: "c4", front: "O que é reversibilidade em decisões e por que importa?", back: "Decisões reversíveis podem ser desfeitas — tome-as rápido. Decisões irreversíveis (two-way vs one-way door) merecem mais tempo e cuidado antes de agir." },
          { id: "c5", front: "O que é o custo de oportunidade em uma decisão?", back: "O valor da melhor alternativa que você abriu mão ao escolher uma opção. Toda escolha tem um custo invisível: o que você não vai fazer por ter escolhido isso." },
        ],
        quiz: [
          { id: "q1", question: "Uma empresa toma uma decisão bem fundamentada mas o mercado vai contra ela e perde dinheiro. Como avaliar essa decisão?", options: ["Foi uma má decisão, pois gerou prejuízo","Foi uma boa decisão, pois o processo foi sólido mesmo com resultado ruim","Não é possível avaliar sem mais dados","Foi uma decisão mediana, pois não antecipou o mercado"], answerIndex: 1, explanation: "Resultados incluem aleatoriedade. Uma decisão é boa se foi tomada com o melhor processo possível dado o que se sabia. Avaliar pelo resultado cria incentivos errados e confunde sorte com competência." },
          { id: "q2", question: "Para que serve o pré-mortem antes de uma decisão importante?", options: ["Para convencer a equipe de que o plano vai dar errado","Para revelar riscos e pontos cegos que o otimismo natural tende a esconder","Para substituir a análise de dados concretos","Para adiar a decisão indefinidamente"], answerIndex: 1, explanation: "O pré-mortem usa pensamento contrafactual: 'e se isso falhar?' força a identificação de riscos que o entusiasmo com o plano normalmente suprime. É uma das ferramentas mais eficazes de gestão de risco." },
          { id: "q3", question: "Por que decisões irreversíveis merecem mais tempo de análise do que decisões reversíveis?", options: ["Porque decisões irreversíveis sempre têm maior impacto financeiro","Porque erros em decisões irreversíveis não podem ser corrigidos; em reversíveis, você pode ajustar o curso","Porque decisões reversíveis são mais complexas de analisar","Porque o tempo de análise sempre melhora o resultado"], answerIndex: 1, explanation: "Jeff Bezos chama isso de portas de uma vs duas vias. Portas de duas vias (reversíveis) devem ser abertas rapidamente. Portas de uma via (irreversíveis) exigem cautela máxima." },
          { id: "q4", question: "O que o conceito de custo de oportunidade revela sobre qualquer escolha?", options: ["Que toda escolha tem um custo financeiro direto","Que toda escolha implica abrir mão da melhor alternativa disponível","Que escolhas devem sempre maximizar retorno financeiro","Que decisões com custo de oportunidade alto devem ser evitadas"], answerIndex: 1, explanation: "Ao escolher A, você necessariamente não escolhe B, C, D. O custo de oportunidade é o valor da melhor opção descartada — um custo real mesmo que invisível na contabilidade convencional." },
          { id: "q5", question: "Qual é a armadilha de esperar por certeza absoluta antes de decidir?", options: ["Leva a decisões precipitadas sem análise suficiente","A inação também é uma decisão — com seus próprios riscos e custos de oportunidade","Produz excesso de dados que dificulta a análise","Elimina o componente de sorte das decisões"], answerIndex: 1, explanation: "Certeza absoluta raramente existe em decisões importantes. Quem espera por ela frequentemente perde janelas de oportunidade — e a inação tem custos tão reais quanto a ação errada." },
        ],
      },
      en: {
        title: "Decision Making Under Uncertainty",
        lesson: {
          title: "Decision Making Under Uncertainty",
          summary: "Most important decisions are made with incomplete information. Understanding how to think well under uncertainty is one of the most valuable skills you can develop.",
          audioUrl: null,
          blocks: [
            { type: "h2", text: "Why is deciding hard?" },
            { type: "p", text: "Deciding would be simple if we had all the information. The problem is we almost never do. Important decisions — career, business, investments, relationships — occur under fundamental uncertainty." },
            { type: "p", text: "The trap is waiting for certainty before acting. Those who wait for certainty don't decide — they choose inaction, which is also a decision with its own consequences." },
            { type: "h2", text: "Decision quality vs. outcome" },
            { type: "p", text: "A common mistake is judging decisions by their outcomes. A good bet can go wrong; a bad bet can succeed through luck. What you control is the quality of the decision process, not the outcome." },
            { type: "bullets", items: [
              "Good decision + good outcome: luck confirming a good process",
              "Good decision + bad outcome: bad luck — the process was still correct",
              "Bad decision + good outcome: luck disguised as competence",
              "Bad decision + bad outcome: expected consequence",
            ]},
            { type: "h2", text: "Tools for better decisions" },
            { type: "p", text: "Pre-mortem: imagine your decision has already failed. What caused the failure? This reveals risks that natural optimism hides. Regret minimization: which decision will you regret less in 10 years?" },
            { type: "quote", text: "You cannot control the outcome. You can control the process. Judge yourself by the process. — Annie Duke" },
          ],
        },
        cards: [
          { id: "c1", front: "Why is judging a decision by its outcome a mistake?", back: "Because outcomes have a luck component. A bad decision can succeed by chance; a great one can fail. What matters is the quality of the decision-making process." },
          { id: "c2", front: "What is a pre-mortem?", back: "A technique where you imagine your decision has already failed and work backwards to identify what caused the failure — revealing risks that natural optimism conceals." },
          { id: "c3", front: "What is Jeff Bezos's regret minimization framework?", back: "Project yourself to age 80 and ask: 'Will I regret not having tried this?' If yes, the risk of trying is smaller than the risk of not trying." },
          { id: "c4", front: "What is reversibility in decisions and why does it matter?", back: "Reversible decisions can be undone — make them fast. Irreversible decisions (two-way vs one-way doors) deserve more time and care before acting." },
          { id: "c5", front: "What is opportunity cost in a decision?", back: "The value of the best alternative you gave up by choosing one option. Every choice has an invisible cost: what you won't do because you chose this." },
        ],
        quiz: [
          { id: "q1", question: "A company makes a well-reasoned decision but the market moves against it and loses money. How should this decision be evaluated?", options: ["It was a bad decision, since it generated losses","It was a good decision, since the process was sound even with a bad outcome","It's impossible to evaluate without more data","It was a mediocre decision for not anticipating the market"], answerIndex: 1, explanation: "Outcomes include randomness. A decision is good if it was made with the best possible process given what was known. Evaluating by outcome creates wrong incentives and confuses luck with competence." },
          { id: "q2", question: "What is the purpose of a pre-mortem before an important decision?", options: ["To convince the team the plan will fail","To reveal risks and blind spots that natural optimism tends to hide","To replace concrete data analysis","To indefinitely delay the decision"], answerIndex: 1, explanation: "The pre-mortem uses counterfactual thinking: 'what if this fails?' forces identification of risks that enthusiasm for the plan normally suppresses. It's one of the most effective risk management tools." },
          { id: "q3", question: "Why do irreversible decisions deserve more analysis time than reversible ones?", options: ["Because irreversible decisions always have greater financial impact","Because errors in irreversible decisions can't be corrected; in reversible ones, you can adjust course","Because reversible decisions are more complex to analyze","Because analysis time always improves the outcome"], answerIndex: 1, explanation: "Jeff Bezos calls this one-way vs two-way doors. Two-way doors (reversible) should be opened quickly. One-way doors (irreversible) require maximum caution." },
          { id: "q4", question: "What does the concept of opportunity cost reveal about any choice?", options: ["That every choice has a direct financial cost","That every choice implies giving up the best available alternative","That choices should always maximize financial return","That decisions with high opportunity cost should be avoided"], answerIndex: 1, explanation: "By choosing A, you necessarily don't choose B, C, D. The opportunity cost is the value of the best discarded option — a real cost even if invisible in conventional accounting." },
          { id: "q5", question: "What is the trap of waiting for absolute certainty before deciding?", options: ["It leads to hasty decisions without sufficient analysis","Inaction is also a decision — with its own risks and opportunity costs","It produces excess data that makes analysis harder","It eliminates the luck component from decisions"], answerIndex: 1, explanation: "Absolute certainty rarely exists in important decisions. Those who wait for it frequently miss windows of opportunity — and inaction has costs just as real as wrong action." },
        ],
      },
      es: {
        title: "Toma de Decisiones bajo Incertidumbre",
        lesson: {
          title: "Toma de Decisiones bajo Incertidumbre",
          summary: "La mayoría de las decisiones importantes se toman con información incompleta. Entender cómo pensar bien bajo incertidumbre es una de las habilidades más valiosas que existen.",
          audioUrl: null,
          blocks: [
            { type: "h2", text: "¿Por qué decidir es difícil?" },
            { type: "p", text: "Decidir sería simple si tuviéramos toda la información. El problema es que casi nunca la tenemos. Las decisiones importantes — carrera, negocios, inversiones, relaciones — ocurren bajo incertidumbre fundamental." },
            { type: "p", text: "La trampa es esperar la certeza antes de actuar. Quien espera la certeza no decide — elige la inacción, que también es una decisión con sus propias consecuencias." },
            { type: "h2", text: "Calidad de la decisión vs. resultado" },
            { type: "p", text: "Un error común es juzgar las decisiones por sus resultados. Una buena apuesta puede salir mal; una mala puede salir bien por suerte. Lo que controlas es la calidad del proceso de decisión, no el resultado." },
            { type: "bullets", items: [
              "Buena decisión + buen resultado: suerte confirmando un buen proceso",
              "Buena decisión + mal resultado: mala suerte — el proceso aún era correcto",
              "Mala decisión + buen resultado: suerte disfrazada de competencia",
              "Mala decisión + mal resultado: consecuencia esperada",
            ]},
            { type: "h2", text: "Herramientas para decidir mejor" },
            { type: "p", text: "Pre-mortem: imagina que tu decisión ya fracasó. ¿Qué causó el fracaso? Esto revela riesgos que el optimismo natural oculta. Minimización del arrepentimiento: ¿qué decisión lamentarás menos dentro de 10 años?" },
            { type: "quote", text: "No puedes controlar el resultado. Puedes controlar el proceso. Júzgate por el proceso. — Annie Duke" },
          ],
        },
        cards: [
          { id: "c1", front: "¿Por qué juzgar una decisión por su resultado es un error?", back: "Porque los resultados tienen un componente de suerte. Una mala decisión puede salir bien por casualidad; una excelente puede fallar. Lo que importa es la calidad del proceso de decisión." },
          { id: "c2", front: "¿Qué es un pre-mortem?", back: "Una técnica en la que imaginas que tu decisión ya fracasó y trabajas hacia atrás para identificar qué causó el fracaso — revelando riesgos que el optimismo natural oculta." },
          { id: "c3", front: "¿En qué consiste el marco de minimización del arrepentimiento de Jeff Bezos?", back: "Proyectarte a los 80 años y preguntar: '¿Me arrepentiré de no haber intentado esto?' Si la respuesta es sí, el riesgo de intentarlo es menor que el riesgo de no intentarlo." },
          { id: "c4", front: "¿Qué es la reversibilidad en las decisiones y por qué importa?", back: "Las decisiones reversibles pueden deshacerse — tómalas rápido. Las decisiones irreversibles (puertas de una vs dos vías) merecen más tiempo y cuidado antes de actuar." },
          { id: "c5", front: "¿Qué es el costo de oportunidad en una decisión?", back: "El valor de la mejor alternativa a la que renunciaste al elegir una opción. Toda elección tiene un costo invisible: lo que no harás por haber elegido esto." },
        ],
        quiz: [
          { id: "q1", question: "Una empresa toma una decisión bien fundamentada pero el mercado va en su contra y pierde dinero. ¿Cómo evaluar esa decisión?", options: ["Fue una mala decisión, ya que generó pérdidas","Fue una buena decisión, ya que el proceso fue sólido aunque el resultado fue malo","No es posible evaluar sin más datos","Fue una decisión mediocre por no anticipar el mercado"], answerIndex: 1, explanation: "Los resultados incluyen aleatoriedad. Una decisión es buena si se tomó con el mejor proceso posible dado lo que se sabía. Evaluar por el resultado crea incentivos equivocados y confunde suerte con competencia." },
          { id: "q2", question: "¿Para qué sirve el pre-mortem antes de una decisión importante?", options: ["Para convencer al equipo de que el plan va a fallar","Para revelar riesgos y puntos ciegos que el optimismo natural tiende a ocultar","Para reemplazar el análisis de datos concretos","Para aplazar la decisión indefinidamente"], answerIndex: 1, explanation: "El pre-mortem usa pensamiento contrafactual: '¿y si esto falla?' fuerza la identificación de riesgos que el entusiasmo por el plan normalmente suprime. Es una de las herramientas más efectivas de gestión de riesgos." },
          { id: "q3", question: "¿Por qué las decisiones irreversibles merecen más tiempo de análisis que las reversibles?", options: ["Porque las decisiones irreversibles siempre tienen mayor impacto financiero","Porque los errores en decisiones irreversibles no pueden corregirse; en las reversibles, puedes ajustar el curso","Porque las decisiones reversibles son más complejas de analizar","Porque el tiempo de análisis siempre mejora el resultado"], answerIndex: 1, explanation: "Jeff Bezos llama a esto puertas de una vs dos vías. Las puertas de dos vías (reversibles) deben abrirse rápidamente. Las puertas de una vía (irreversibles) requieren máxima cautela." },
          { id: "q4", question: "¿Qué revela el concepto de costo de oportunidad sobre cualquier elección?", options: ["Que toda elección tiene un costo financiero directo","Que toda elección implica renunciar a la mejor alternativa disponible","Que las elecciones deben siempre maximizar el retorno financiero","Que las decisiones con alto costo de oportunidad deben evitarse"], answerIndex: 1, explanation: "Al elegir A, necesariamente no eliges B, C, D. El costo de oportunidad es el valor de la mejor opción descartada — un costo real aunque invisible en la contabilidad convencional." },
          { id: "q5", question: "¿Cuál es la trampa de esperar la certeza absoluta antes de decidir?", options: ["Lleva a decisiones apresuradas sin análisis suficiente","La inacción también es una decisión — con sus propios riesgos y costos de oportunidad","Produce exceso de datos que dificulta el análisis","Elimina el componente de suerte de las decisiones"], answerIndex: 1, explanation: "La certeza absoluta raramente existe en decisiones importantes. Quienes la esperan frecuentemente pierden ventanas de oportunidad — y la inacción tiene costos tan reales como la acción equivocada." },
        ],
      },
    },
  },
];

// ─── HELPERS ──────────────────────────────────────────────────────────────────

const LANGS = ["pt", "en", "es"];

async function uploadJson(fileRef, data) {
  await fileRef.save(JSON.stringify(data, null, 2), {
    contentType: "application/json",
    metadata: { cacheControl: "public, max-age=86400" },
  });
}

// ─── JOB 1: Patch existing packs ─────────────────────────────────────────────

async function patchExisting(packId) {
  const patch = PATCHES[packId];
  for (const lang of LANGS) {
    const filePath = `packs/${packId}/v1/${lang}.json`;
    const fileRef = bucket.file(filePath);
    const [exists] = await fileRef.exists();
    if (!exists) { console.log(`  [skip] ${filePath} not found`); continue; }

    const [buf] = await fileRef.download();
    const pack = JSON.parse(buf.toString("utf8"));

    const existingCardIds = new Set((pack.cards || []).map(c => c.id));
    const newCards = patch[lang].cards.filter(c => !existingCardIds.has(c.id));
    pack.cards = [...(pack.cards || []), ...newCards];

    const existingQuizIds = new Set((pack.quiz || []).map(q => q.id));
    const newQuiz = patch[lang].quiz.filter(q => !existingQuizIds.has(q.id));
    pack.quiz = [...(pack.quiz || []), ...newQuiz];

    await uploadJson(fileRef, pack);
    console.log(`  [patched] ${filePath} → ${pack.cards.length} cards, ${pack.quiz.length} quiz (+${newCards.length}c +${newQuiz.length}q)`);
  }
}

// ─── JOB 2: Upload missing packs ─────────────────────────────────────────────

async function uploadMissing(packDef) {
  for (const lang of LANGS) {
    const langData = packDef.langs[lang];
    const filePath = `packs/${packDef.id}/v${packDef.version}/${lang}.json`;
    const fileRef = bucket.file(filePath);
    const [exists] = await fileRef.exists();
    if (exists) { console.log(`  [exists] ${filePath} — skipping`); continue; }

    const packJson = {
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

    await uploadJson(fileRef, packJson);
    console.log(`  [uploaded] ${filePath} (${packJson.cards.length} cards, ${packJson.quiz.length} quiz)`);
  }

  await db.collection("lessons").doc(packDef.id).set({
    trackId: packDef.trackId,
    version: packDef.version,
    order: packDef.order,
    estimatedMinutes: packDef.estimatedMinutes,
    difficulty: packDef.difficulty,
    title: Object.fromEntries(LANGS.map(l => [l, packDef.langs[l].title])),
    status: "published",
    tier: "free",
    prerequisites: [],
  }, { merge: true });
  console.log(`  [firestore] lessons/${packDef.id} registered`);
}

// ─── MAIN ─────────────────────────────────────────────────────────────────────

async function main() {
  console.log("\n=== JOB 1: Patching existing foundations packs ===\n");
  for (const packId of Object.keys(PATCHES)) {
    console.log(`\n[${packId}]`);
    await patchExisting(packId);
  }

  console.log("\n=== JOB 2: Uploading missing foundations packs ===\n");
  for (const packDef of MISSING_PACKS) {
    console.log(`\n[${packDef.id}]`);
    await uploadMissing(packDef);
  }

  console.log("\n✅ foundations track done.\n");
  process.exit(0);
}

main().catch(e => { console.error("Fatal:", e.message); process.exit(1); });
