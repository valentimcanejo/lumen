/**
 * preview-covers.js
 * Reads all lessons from Firestore and generates a static HTML file
 * with a grid of cover images + lesson names for visual review.
 *
 * Usage:
 *   node scripts/preview-covers.js
 *   open scripts/covers-preview.html
 */

const fs = require("fs");
const path = require("path");
const admin = require("firebase-admin");

const serviceAccount = require(path.join(__dirname, "serviceAccountKey.json"));

admin.initializeApp({ credential: admin.credential.cert(serviceAccount) });
const db = admin.firestore();

const TRACK_ORDER = [
  "foundations",
  "geopolitics",
  "economics",
  "critical_thinking",
  "history",
  "psychology",
  "philosophy",
  "politics",
  "science",
  "technology",
];

async function main() {
  const snap = await db.collection("lessons").get();

  const lessons = [];
  snap.forEach((doc) => {
    const d = doc.data();
    lessons.push({
      id: doc.id,
      title: d.title || doc.id,
      coverImageUrl: d.coverImageUrl || null,
      photographer: d.coverImageCredit?.photographer || null,
    });
  });

  // Sort by track order then alphabetically within track
  lessons.sort((a, b) => {
    const trackA = TRACK_ORDER.findIndex((t) => a.id.startsWith(t));
    const trackB = TRACK_ORDER.findIndex((t) => b.id.startsWith(t));
    if (trackA !== trackB) return trackA - trackB;
    return a.id.localeCompare(b.id);
  });

  const cards = lessons
    .map((l) => {
      const img = l.coverImageUrl
        ? `<img src="${l.coverImageUrl}&w=400&q=60" loading="lazy" />`
        : `<div class="no-img">sem foto</div>`;
      const credit = l.photographer ? `<span class="credit">${l.photographer}</span>` : "";
      return `
      <div class="card" data-id="${l.id}">
        ${img}
        <div class="info">
          <span class="id">${l.id}</span>
          <span class="title">${l.title}</span>
          ${credit}
        </div>
      </div>`;
    })
    .join("");

  const html = `<!DOCTYPE html>
<html lang="pt">
<head>
  <meta charset="UTF-8" />
  <title>Lumen — Preview de Covers</title>
  <style>
    * { box-sizing: border-box; margin: 0; padding: 0; }
    body { background: #0B0F14; color: #e0e0e0; font-family: system-ui, sans-serif; padding: 24px; }
    h1 { color: #F5C77A; margin-bottom: 8px; font-size: 20px; }
    .total { color: #888; font-size: 13px; margin-bottom: 16px; }

    /* Rejected panel */
    #rejected-panel { background: #121826; border: 1px solid #2a2a3a; border-radius: 10px; padding: 16px; margin-bottom: 24px; }
    #rejected-panel h2 { font-size: 13px; color: #F5C77A; margin-bottom: 10px; }
    #rejected-empty { color: #555; font-size: 13px; font-style: italic; }
    #rejected-list { display: flex; flex-wrap: wrap; gap: 8px; }
    .rejected-tag { background: #1f1030; border: 1px solid #7c3aed; border-radius: 6px; padding: 4px 10px; font-size: 12px; display: flex; align-items: center; gap: 6px; }
    .rejected-tag button { background: none; border: none; color: #a78bfa; cursor: pointer; font-size: 14px; line-height: 1; padding: 0; }
    #copy-btn { margin-top: 12px; background: #7c3aed; color: #fff; border: none; border-radius: 6px; padding: 6px 14px; font-size: 12px; cursor: pointer; }
    #copy-btn:hover { background: #6d28d9; }

    /* Grid */
    .grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(220px, 1fr)); gap: 16px; }
    .card { background: #121826; border-radius: 10px; overflow: hidden; cursor: pointer; border: 2px solid transparent; transition: border-color 0.15s, opacity 0.15s; }
    .card:hover { border-color: #7c3aed44; }
    .card.rejected { border-color: #7c3aed; opacity: 0.6; }
    .card img { width: 100%; height: 160px; object-fit: cover; display: block; }
    .no-img { width: 100%; height: 160px; display: flex; align-items: center; justify-content: center; color: #555; font-size: 13px; background: #1a1a2e; }
    .info { padding: 10px 12px 12px; }
    .id { display: block; font-size: 11px; color: #F5C77A; margin-bottom: 4px; opacity: 0.7; }
    .title { display: block; font-size: 13px; font-weight: 600; line-height: 1.3; margin-bottom: 4px; }
    .credit { display: block; font-size: 11px; color: #666; margin-top: 4px; }
    .badge { float: right; background: #7c3aed; color: #fff; font-size: 10px; border-radius: 4px; padding: 2px 6px; margin-top: 2px; }
  </style>
</head>
<body>
  <h1>Lumen — Preview de Covers</h1>
  <p class="total">${lessons.length} lições · ${lessons.filter((l) => l.coverImageUrl).length} com foto · clique para marcar como ruim</p>

  <div id="rejected-panel">
    <h2>Marcadas para trocar (<span id="rejected-count">0</span>)</h2>
    <div id="rejected-empty">Nenhuma selecionada ainda.</div>
    <div id="rejected-list" style="display:none"></div>
    <button id="copy-btn" style="display:none" onclick="copyList()">Copiar lista</button>
  </div>

  <div class="grid">${cards}</div>

  <script>
    const rejected = new Set();

    document.querySelectorAll('.card').forEach(card => {
      card.addEventListener('click', () => {
        const id = card.dataset.id;
        if (rejected.has(id)) {
          rejected.delete(id);
          card.classList.remove('rejected');
          card.querySelector('.badge')?.remove();
        } else {
          rejected.add(id);
          card.classList.add('rejected');
          const badge = document.createElement('span');
          badge.className = 'badge';
          badge.textContent = 'trocar';
          card.querySelector('.info').prepend(badge);
        }
        updatePanel();
      });
    });

    function updatePanel() {
      const count = rejected.size;
      document.getElementById('rejected-count').textContent = count;
      const empty = document.getElementById('rejected-empty');
      const list = document.getElementById('rejected-list');
      const btn = document.getElementById('copy-btn');

      if (count === 0) {
        empty.style.display = '';
        list.style.display = 'none';
        btn.style.display = 'none';
        return;
      }

      empty.style.display = 'none';
      list.style.display = 'flex';
      btn.style.display = 'inline-block';

      list.innerHTML = [...rejected].map(id => \`
        <span class="rejected-tag">
          \${id}
          <button onclick="removeTag('\${id}')" title="Desmarcar">×</button>
        </span>
      \`).join('');
    }

    function removeTag(id) {
      rejected.delete(id);
      const card = document.querySelector(\`.card[data-id="\${id}"]\`);
      if (card) {
        card.classList.remove('rejected');
        card.querySelector('.badge')?.remove();
      }
      updatePanel();
    }

    function copyList() {
      const text = [...rejected].join('\\n');
      navigator.clipboard.writeText(text).then(() => {
        const btn = document.getElementById('copy-btn');
        btn.textContent = 'Copiado!';
        setTimeout(() => btn.textContent = 'Copiar lista', 1500);
      });
    }
  </script>
</body>
</html>`;

  const out = path.join(__dirname, "covers-preview.html");
  fs.writeFileSync(out, html, "utf8");
  console.log(`✅ Gerado: ${out}`);
  console.log(`   ${lessons.length} lições, ${lessons.filter((l) => l.coverImageUrl).length} com cover`);
}

main().catch(console.error).finally(() => process.exit());
