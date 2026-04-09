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
  foundations:                    "open book learning education",
  foundations_mental_models:      "mind map thinking concept",
  foundations_first_principles:   "building blocks foundation structure",
  foundations_decision_making:    "crossroads decision choice path",
  foundations_probabilistic:      "probability statistics data chart",
  geopolitics:                    "world map globe geopolitics",
  geopolitics_nato:               "nato military alliance soldiers",
  geopolitics_brics:              "emerging markets countries flags",
  geopolitics_middle_east:        "middle east desert landscape",
  geopolitics_china_usa:          "china usa competition flags",
  economics:                      "economics finance stock market",
  economics_inflation:            "inflation money currency prices",
  economics_interest_rates:       "bank interest rates finance",
  economics_fiscal_policy:        "government budget parliament",
  economics_trade:                "shipping containers port trade",
  critical_thinking:              "critical thinking analysis magnifying glass",
  critical_thinking_fallacies:    "debate argument logic chess",
  critical_thinking_bias:         "perspective bias mirror reflection",
  critical_thinking_scientific:   "science laboratory research experiment",
  critical_thinking_rhetoric:     "speech communication podium audience",
  history:                        "ancient history civilization ruins",
  history_wwii:                   "world war two history black white",
  history_cold_war:               "cold war berlin wall iron curtain",
  history_colonialism:            "colonialism history map exploration ship",
  history_industrial_revolution:  "industrial revolution factory steam engine",
  psychology:                     "psychology mind brain human",
  psychology_emotions:            "emotions feelings human face",
  psychology_habits:              "habits routine daily morning",
  psychology_social:              "social interaction people crowd",
  psychology_resilience:          "resilience strength overcome mountain",
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

  const args = process.argv.slice(2);
  const packFilter = args.includes("--pack") ? args[args.indexOf("--pack") + 1] : null;

  const packIds = packFilter ? [packFilter] : Object.keys(KEYWORDS);
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
