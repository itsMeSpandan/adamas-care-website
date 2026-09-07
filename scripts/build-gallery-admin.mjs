import { readFileSync, writeFileSync } from "fs";
import { join } from "path";
import { fileURLToPath } from "url";

const DIR = join(fileURLToPath(import.meta.url), "..", "..", "snapshots");

const pages = [
  { file: "admin-dashboard.png", label: "Admin Dashboard (Full Page)", dim: "1440 × 900", full: true },
  { file: "admin-earnings.png", label: "Employee Earnings (Viewport)", dim: "1440 × 900" },
  { file: "debug-login.png", label: "Debug — Login State", dim: "1440 × 900" },
];

function toBase64(file) {
  try {
    const buf = readFileSync(join(DIR, file));
    return `data:image/png;base64,${buf.toString("base64")}`;
  } catch {
    return "";
  }
}

const cards = pages.map(p => {
  const b64 = toBase64(p.file);
  if (!b64) return "";
  const cls = p.full ? 'card full' : 'card';
  return `
    <div class="${cls}">
      <img src="${b64}" alt="${p.label}" onclick="openLightbox(this)">
      <div class="label">${p.label} <span>${p.dim}</span></div>
    </div>`;
}).filter(Boolean).join("\n");

const html = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Admin Dashboard — Screenshots</title>
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body { background: #1a1a1a; color: #e8ddd3; font-family: 'Segoe UI', system-ui, sans-serif; padding: 24px; }
    h1 { text-align: center; font-size: 24px; font-weight: 600; margin-bottom: 8px; color: #e8ddd3; }
    .subtitle { text-align: center; font-size: 13px; color: #888; margin-bottom: 32px; }
    .grid { display: grid; grid-template-columns: 1fr; gap: 24px; max-width: 1400px; margin: 0 auto; }
    .card { background: #242424; border-radius: 12px; overflow: hidden; border: 1px solid #333; transition: transform 0.2s; }
    .card:hover { transform: translateY(-2px); border-color: #555; }
    .card img { width: 100%; display: block; cursor: zoom-in; }
    .card .label { padding: 12px 16px; font-size: 13px; font-weight: 600; color: #c9b8a8; display: flex; justify-content: space-between; }
    .card .label span { color: #666; font-weight: 400; font-size: 12px; }
    .full img { cursor: zoom-in; }
    .lightbox { display: none; position: fixed; inset: 0; background: rgba(0,0,0,0.92); z-index: 100; cursor: zoom-out; justify-content: center; align-items: center; padding: 20px; }
    .lightbox.active { display: flex; }
    .lightbox img { max-width: 95vw; max-height: 95vh; object-fit: contain; border-radius: 8px; }
    .close { position: fixed; top: 16px; right: 24px; color: #fff; font-size: 32px; cursor: pointer; z-index: 101; background: rgba(0,0,0,0.5); width: 44px; height: 44px; border-radius: 50%; display: flex; align-items: center; justify-content: center; }
  </style>
</head>
<body>
  <h1>Admin Dashboard — Screenshots</h1>
  <p class="subtitle">Employee earnings with month navigation</p>
  <div class="grid">${cards}</div>
  <div class="lightbox" id="lightbox" onclick="closeLightbox()">
    <div class="close" onclick="closeLightbox()">×</div>
    <img id="lightbox-img" src="" alt="">
  </div>
  <script>
    function openLightbox(img) { document.getElementById('lightbox-img').src = img.src; document.getElementById('lightbox').classList.add('active'); }
    function closeLightbox() { document.getElementById('lightbox').classList.remove('active'); }
    document.addEventListener('keydown', e => { if (e.key === 'Escape') closeLightbox(); });
  </script>
</body>
</html>`;

writeFileSync(join(DIR, "gallery-admin.html"), html);
console.log(`✅ Built gallery-admin.html (${Math.round(html.length / 1024)} KB)`);
