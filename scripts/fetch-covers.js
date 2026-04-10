/**
 * fetch-covers.js
 * Fetches cover photos from Unsplash for each pack and stores the URL in
 * the Firestore lesson doc (lessons/{packId}.coverImageUrl).
 *
 * Strategy: search Unsplash by keyword, pick the first result, save the URL.
 * No download or re-upload — the Unsplash CDN URL is stable and free.
 *
 * Usage:
 *   UNSPLASH_ACCESS_KEY=... node scripts/fetch-covers.js
 *   UNSPLASH_ACCESS_KEY=... node scripts/fetch-covers.js --pack geopolitics_nato
 *
 * Get a free API key at https://unsplash.com/developers (50 req/hr on free tier)
 */

const https = require("https");
const admin = require("firebase-admin");
const path = require("path");

const serviceAccount = require(path.join(__dirname, "serviceAccountKey.json"));

admin.initializeApp({
  credential: admin.credential.cert(serviceAccount),
});

const db = admin.firestore();

// Search keywords per pack ID
const KEYWORDS = {
  // Foundations — metáfora visual, sensação de pensar
  foundations:                    "person reading book sunlight window",
  foundations_mental_models:      "chess pieces wooden table strategy",
  foundations_first_principles:   "brick wall foundation construction",
  foundations_decision_making:    "fork road path forest choice",
  foundations_probabilistic:      "dice rolling wooden table",
  foundations_complexity:         "tangled colorful threads knot",
  foundations_inversion:          "upside down city reflection water",
  foundations_opportunity_cost:   "two doors hallway choice architecture",
  foundations_learning:           "notebook pen desk studying lamp",
  foundations_second_order:       "domino effect falling chain reaction",

  // Geopolítica — lugar ou símbolo reconhecível
  geopolitics:                    "earth globe blue marble space",
  geopolitics_nato:               "military soldiers formation uniform",
  geopolitics_brics:              "emerging city skyline developing country",
  geopolitics_middle_east:        "desert sand dunes middle east",
  geopolitics_china_usa:          "flags wind outdoor city",
  geopolitics_europe:             "european parliament strasbourg architecture",
  geopolitics_russia:             "kremlin moscow red square winter",
  geopolitics_africa:             "africa savanna landscape sunrise",
  geopolitics_climate:            "melting glacier ice arctic",
  geopolitics_tech_power:         "satellite dish antenna technology",

  // Economia — contexto real, não gráfico de bolsa
  economics:                      "market stall vendors goods trade",
  economics_inflation:            "supermarket shelf price tags grocery",
  economics_interest_rates:       "bank building facade architecture marble",
  economics_fiscal_policy:        "government capitol building dome",
  economics_trade:                "cargo ship container port aerial",
  economics_inequality:           "poverty street homeless urban",
  economics_behavioral:           "people choice supermarket aisle shopping",
  economics_globalization:        "airport terminal international travel crowd",
  economics_money:                "coins paper money currency scattered",
  economics_markets:              "new york stock exchange wall street",

  // Pensamento Crítico — metáfora visual
  critical_thinking:              "magnifying glass newspaper investigation",
  critical_thinking_fallacies:    "two people debate argument discussion",
  critical_thinking_bias:         "optical illusion perspective trick eye",
  critical_thinking_scientific:   "scientist microscope laboratory white coat",
  critical_thinking_rhetoric:     "microphone speaker stage audience",
  critical_thinking_epistemology: "ancient library books shelves knowledge",
  critical_thinking_data:         "dashboard screen graphs data analytics",
  critical_thinking_systems:      "interconnected pipes network industrial",
  critical_thinking_motivated:    "person mirror self reflection",
  critical_thinking_argumentation:"people talking coffee debate table",

  // História — literal, foto do período/evento
  history:                        "ancient roman colosseum ruins rome",
  history_wwii:                   "world war two normandy beach landing",
  history_cold_war:               "berlin wall graffiti checkpoint",
  history_colonialism:            "old sailing ship ocean exploration",
  history_industrial_revolution:  "steam engine locomotive factory smoke",
  history_renaissance:            "florence cathedral duomo tuscany italy",
  history_french_revolution:      "paris bastille eiffel tower france",
  history_empires:                "roman colosseum ancient empire architecture",
  history_latin_america:          "machu picchu inca ruins peru mountains",
  history_wwi:                    "soldiers trench world war one",

  // Psicologia — humano + emoção
  psychology:                     "human face portrait close up emotion",
  psychology_emotions:            "woman crying tears rain emotion",
  psychology_habits:              "morning coffee routine alarm clock",
  psychology_social:              "group people laughing together outdoors",
  psychology_resilience:          "person climbing mountain summit effort",
  psychology_motivation:          "runner athlete starting line track",
  psychology_memory:              "old photographs album nostalgia memories",
  psychology_relationships:       "two people hands holding together",
  psychology_anxiety:             "person alone crowded subway underground",
  psychology_identity:            "person shadow wall self silhouette",

  // Filosofia — evocativo, sensação > descrição
  philosophy:                     "ancient greek temple parthenon athens",
  philosophy_ethics:              "scales justice balance bronze",
  philosophy_epistemology:        "candle flame darkness books night",
  philosophy_stoicism:            "marble bust ancient rome sculpture",
  philosophy_existentialism:      "person alone fog road walking",
  philosophy_logic:               "blackboard equations mathematics chalk",
  philosophy_political_phil:      "parliament empty chamber seats architecture",
  philosophy_mind:                "consciousness abstract light tunnel surreal",
  philosophy_free_will:           "open cage bird flying freedom sky",
  philosophy_meaning:             "person silhouette starry sky milky way",

  // Política — símbolo reconhecível ou multidão real
  politics:                       "capitol building washington dc dome",
  politics_democracy:             "election day polling station queue people",
  politics_constitution:          "old document parchment seal law",
  politics_systems:               "world flags united nations assembly",
  politics_parties:               "political rally crowd flags outdoor",
  politics_populism:              "massive crowd stadium rally night",
  politics_media:                 "newsroom journalists television cameras",
  politics_authoritarianism:      "surveillance camera wall urban street",
  politics_civil_rights:          "civil rights march protest crowd",
  politics_future:                "smart city futuristic architecture lights",

  // Ciência — o objeto de estudo, literal
  science:                        "scientist laboratory pipette research",
  science_evolution:              "fossil bones dinosaur museum natural history",
  science_physics:                "physics quantum wave light abstract",
  science_computing:              "vintage computer transistor circuit board",
  science_internet:               "undersea cable fiber optic light",
  science_ai:                     "robot humanoid machine technology",
  science_climate:                "wildfire smoke aerial forest burning",
  science_biotech:                "dna helix strand blue laboratory",
  science_neuroscience:           "brain scan mri medical imaging",
  science_future:                 "futuristic laboratory technology research",

  // Negócios — contexto real de trabalho
  business:                       "entrepreneur whiteboard startup office",
  business_models:                "sticky notes whiteboard business planning",
  business_strategy:              "chess board game strategy pieces",
  business_startup:               "startup team meeting table laptop",
  business_finance:               "spreadsheet laptop coffee desk numbers",
  business_marketing:             "brand logo neon sign store window",
  business_leadership:            "team meeting presentation office boardroom",
  business_vc:                    "handshake deal business suit office",
  business_scale:                 "aerial city network roads infrastructure",
  business_future:                "remote work laptop home desk window",
};

const UNSPLASH_API = "api.unsplash.com";

function httpsGet(options) {
  return new Promise((resolve, reject) => {
    const req = https.request(options, (res) => {
      let data = "";
      res.on("data", (chunk) => { data += chunk; });
      res.on("end", () => {
        try { resolve({ status: res.statusCode, body: JSON.parse(data) }); }
        catch { resolve({ status: res.statusCode, body: data }); }
      });
    });
    req.on("error", reject);
    req.end();
  });
}

async function searchUnsplash(keyword, accessKey) {
  const query = encodeURIComponent(keyword);
  const { status, body } = await httpsGet({
    hostname: UNSPLASH_API,
    path: `/search/photos?query=${query}&per_page=1&orientation=landscape`,
    headers: {
      "Authorization": `Client-ID ${accessKey}`,
      "Accept-Version": "v1",
    },
  });

  if (status !== 200) throw new Error(`Unsplash API returned ${status}`);
  const results = body?.results;
  if (!results?.length) throw new Error(`No results for "${keyword}"`);

  const photo = results[0];
  // Use a clean, sized URL: 1080px wide, 80% quality
  const url = `${photo.urls.raw}&w=1080&q=80&fm=jpg&fit=crop`;
  const downloadLocation = photo.links.download_location;
  return {
    url,
    downloadLocation,
    photographer: photo.user.name,
    profileUrl: photo.user.links.html, // e.g. https://unsplash.com/@username
  };
}

async function triggerDownload(downloadLocation, accessKey) {
  // Required by Unsplash API guidelines to credit photographer stats
  const url = new URL(downloadLocation);
  await httpsGet({
    hostname: url.hostname,
    path: `${url.pathname}?${url.searchParams}&client_id=${accessKey}`,
    headers: { "Accept-Version": "v1" },
  });
}

async function main() {
  const accessKey = process.env.UNSPLASH_ACCESS_KEY;
  if (!accessKey) {
    console.error("Missing UNSPLASH_ACCESS_KEY");
    console.error("Get a free key at https://unsplash.com/developers");
    process.exit(1);
  }

  const LEGACY_PACKS = [
    "foundations", "foundations_mental_models", "foundations_first_principles",
    "foundations_decision_making", "foundations_probabilistic",
    "geopolitics", "geopolitics_nato", "geopolitics_brics",
    "geopolitics_middle_east", "geopolitics_china_usa",
    "economics", "economics_inflation", "economics_interest_rates",
    "economics_trade",
    "critical_thinking", "critical_thinking_fallacies", "critical_thinking_bias",
    "critical_thinking_scientific", "critical_thinking_rhetoric",
    "history", "history_wwii", "history_cold_war",
    "history_colonialism", "history_industrial_revolution",
  ];

  const args = process.argv.slice(2);
  const packFilter = args.includes("--pack") ? args[args.indexOf("--pack") + 1] : null;
  const skipExisting = !args.includes("--force") && !args.includes("--legacy");
  const legacyOnly = args.includes("--legacy");

  let packIds = packFilter ? [packFilter] : legacyOnly ? LEGACY_PACKS : Object.keys(KEYWORDS);

  // Skip packs that already have a proper cover (object credit format)
  if (skipExisting && !packFilter) {
    const snap = await db.collection("lessons").get();
    const existing = new Set();
    snap.forEach((d) => {
      const data = d.data();
      if (data.coverImageUrl && typeof data.coverImageCredit === "object" && data.coverImageCredit?.photographer) {
        existing.add(d.id);
      }
    });
    const before = packIds.length;
    packIds = packIds.filter((id) => !existing.has(id));
    console.log(`Skipping ${before - packIds.length} packs with existing covers.`);
  }

  console.log(`Fetching covers for ${packIds.length} packs...\n`);

  let ok = 0, failed = 0;

  for (const packId of packIds) {
    const keyword = KEYWORDS[packId];
    if (!keyword) {
      console.log(`  ${packId} — no keyword defined, skipping`);
      continue;
    }

    process.stdout.write(`  ${packId}... `);
    try {
      const { url, downloadLocation, photographer, profileUrl } = await searchUnsplash(keyword, accessKey);

      // Persist to Firestore (URL + attribution required by Unsplash API Terms §9)
      await db.collection("lessons").doc(packId).update({
        coverImageUrl: url,
        coverImageCredit: { photographer, profileUrl },
      });

      // Register download (Unsplash API requirement)
      await triggerDownload(downloadLocation, accessKey);

      console.log(`✓ ${photographer}`);
      ok++;
    } catch (err) {
      console.log(`✗ ${err.message}`);
      failed++;
    }

    // Respect free tier rate limit (50 req/hr = ~72s between req pairs)
    // In practice 30 packs × 2 requests = 60 requests — fits within the limit
    await new Promise((r) => setTimeout(r, 1500));
  }

  console.log(`\nDone. ${ok} updated, ${failed} failed.`);
  process.exit(0);
}

main();
