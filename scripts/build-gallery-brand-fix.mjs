import { readFileSync, writeFileSync } from 'fs';
const buf = readFileSync('snapshots/nav-brand-fixed.png');
const b64 = buf.toString('base64');
const html = `<!DOCTYPE html><html><head><style>
* { margin:0; padding:0; box-sizing:border-box; }
body { background:#1a1a1a; color:#fff; font-family:system-ui; padding:2rem; display:flex; justify-content:center; }
.card { background:#2a2a2a; border-radius:12px; overflow:hidden; max-width:900px; width:100%; box-shadow:0 4px 20px rgba(0,0,0,0.4); }
.card h3 { padding:1rem 1.5rem; font-size:1rem; color:#ccc; border-bottom:1px solid #3a3a3a; }
.card img { width:100%; display:block; }
</style></head><body>
<div class="card"><h3>DESKTOP — Brand Visible</h3><img src="data:image/png;base64,${b64}" /></div>
</body></html>`;
writeFileSync('public/gallery-brand-fix.html', html);
console.log('Done');
