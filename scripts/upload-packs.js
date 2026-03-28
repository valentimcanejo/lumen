#!/usr/bin/env node
/**
 * Uploads all pack JSONs from mobile/assets/packs/ to Firebase Storage.
 * Uses the Firebase CLI stored token — no service account needed.
 *
 * Usage: node scripts/upload-packs.js
 */

const fs = require("fs");
const path = require("path");
const https = require("https");

const BUCKET = "lumen-13d0d.firebasestorage.app";
const PACKS_DIR = path.join(__dirname, "../mobile/assets/packs");
const CONFIG_PATH = path.join(
  process.env.USERPROFILE || process.env.HOME,
  ".config/configstore/firebase-tools.json",
);
const GOOGLE_TOKEN_URL = "https://oauth2.googleapis.com/token";
const GOOGLE_CLIENT_ID = "563584335869-fgrhgmd47bqnekij5i8b5pr03ho849e6.apps.googleusercontent.com";
const GOOGLE_CLIENT_SECRET = "j9iVZfS8yw-z1W0YnsxUmaop";

function httpsRequest(url, options, body) {
  return new Promise((resolve, reject) => {
    const req = https.request(url, options, (res) => {
      let data = "";
      res.on("data", (chunk) => (data += chunk));
      res.on("end", () => resolve({ status: res.statusCode, body: data }));
    });
    req.on("error", reject);
    if (body) req.write(body);
    req.end();
  });
}

async function getAccessToken() {
  const config = JSON.parse(fs.readFileSync(CONFIG_PATH, "utf8"));
  const tokens = config.tokens;

  if (!tokens) throw new Error("No Firebase CLI tokens found. Run: firebase login");

  const expiresAt = tokens.expires_at || 0;
  if (Date.now() < expiresAt - 60000) {
    return tokens.access_token;
  }

  // Refresh the token
  console.log("Refreshing Firebase CLI token...");
  const body = new URLSearchParams({
    client_id: GOOGLE_CLIENT_ID,
    client_secret: GOOGLE_CLIENT_SECRET,
    refresh_token: tokens.refresh_token,
    grant_type: "refresh_token",
  }).toString();

  const res = await httpsRequest(
    GOOGLE_TOKEN_URL,
    { method: "POST", headers: { "Content-Type": "application/x-www-form-urlencoded" } },
    body,
  );

  if (res.status !== 200) {
    throw new Error(`Token refresh failed (${res.status}): ${res.body}`);
  }

  const refreshed = JSON.parse(res.body);
  const newToken = refreshed.access_token;

  // Update stored config
  config.tokens.access_token = newToken;
  config.tokens.expires_at = Date.now() + refreshed.expires_in * 1000;
  fs.writeFileSync(CONFIG_PATH, JSON.stringify(config, null, 2));

  return newToken;
}

async function uploadFile(localPath, storagePath, accessToken) {
  const content = fs.readFileSync(localPath);
  const encodedPath = encodeURIComponent(storagePath);
  const url = `https://firebasestorage.googleapis.com/v0/b/${BUCKET}/o?name=${encodedPath}&uploadType=media`;

  const res = await httpsRequest(
    url,
    {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${accessToken}`,
        "Content-Type": "application/json",
        "Content-Length": content.length,
      },
    },
    content,
  );

  if (res.status !== 200) {
    throw new Error(`HTTP ${res.status}: ${res.body.slice(0, 200)}`);
  }
}

function storagePathFromFilename(filename) {
  // history_v1_en.json → packs/history/v1/en.json
  const base = filename.replace(".json", "");
  const parts = base.split("_");
  const lang = parts.pop();
  const version = parts.pop(); // "v1"
  const id = parts.join("_");
  return `packs/${id}/${version}/${lang}.json`;
}

async function uploadAll() {
  const token = await getAccessToken();
  const files = fs.readdirSync(PACKS_DIR).filter((f) => f.endsWith(".json"));

  console.log(`Uploading ${files.length} packs to gs://${BUCKET}...\n`);

  let ok = 0;
  let fail = 0;

  for (const filename of files) {
    const localPath = path.join(PACKS_DIR, filename);
    const storagePath = storagePathFromFilename(filename);
    try {
      await uploadFile(localPath, storagePath, token);
      console.log(`  ✓ ${storagePath}`);
      ok++;
    } catch (err) {
      console.error(`  ✗ ${storagePath}: ${err.message}`);
      fail++;
    }
  }

  console.log(`\nDone: ${ok} uploaded, ${fail} failed.`);
}

uploadAll().catch((err) => {
  console.error("\nFatal:", err.message);
  process.exit(1);
});
