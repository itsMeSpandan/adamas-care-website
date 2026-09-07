import { readFileSync, writeFileSync } from 'fs';

const images = ['nav-final-desktop', 'nav-final-mobile'];
const cards = images.map(name => {
  const buf = readFileSync(`snapshots/${name}.png`);
  const b64 = buf.toString('base64');
  const label = name.replace('nav-final-', '').toUpperCase();
  return `<div class="card"><h3>${label}</h3><img src="data:image/png;base64,${b64}" /></div>`;
}).join('\n');

const html = `<!DOCTYPE html><html><head><style>
* { margin:0; padding:0; box-sizing:border-box; }
body { background:#1a1a1a; color:#fff; font-family:system-ui; padding:2rem; }
.gallery { display:flex; flex-direction:column; gap:3rem; align-items:center; }
.card { background:#2a2a2a; border-radius:12px; overflow:hidden; max-width:900px; width:100%; box-shadow:0 4px 20px rgba(0,0,0,0.4); }
.card h3 { padding:1rem 1.5rem; font-size:1rem; color:#ccc; border-bottom:1px solid #3a3a3a; }
.card img { width:100%; display:block; }
</style></head><body>
<div class="gallery">${cards}</div></body></html>`;
writeFileSync('snapshots/gallery-final.html', html);
console.log('Gallery written');
