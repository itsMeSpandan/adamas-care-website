import { createServer } from "http";
import { readFileSync, existsSync, statSync } from "fs";
import { join, extname } from "path";
import { fileURLToPath } from "url";

const DIR = join(fileURLToPath(import.meta.url), "..", "..", "snapshots");
const PORT = 4567;

const MIME = {
  ".html": "text/html",
  ".png": "image/png",
  ".jpg": "image/jpeg",
  ".svg": "image/svg+xml",
  ".css": "text/css",
  ".js": "application/javascript",
};

const server = createServer((req, res) => {
  const file = req.url === "/" ? "/gallery.html" : req.url;
  const path = join(DIR, file);

  if (!existsSync(path) || !statSync(path).isFile()) {
    res.writeHead(404);
    res.end("Not found");
    return;
  }

  const ext = extname(path);
  const mime = MIME[ext] || "application/octet-stream";

  res.writeHead(200, {
    "Content-Type": mime,
    "Cache-Control": "no-cache",
  });
  res.end(readFileSync(path));
});

server.listen(PORT, () => {
  console.log(`📸 Gallery running at http://localhost:${PORT}`);
});
