/**
 * scripts/generate-pwa-icons.ts — placeholder PWA icons (no image deps).
 *
 * Draws the brand mark pixel-by-pixel (beige field + dark disc) and writes:
 *   public/icons/icon-192.png        192×192
 *   public/icons/icon-512.png        512×512
 *   public/icons/icon-maskable-512.png  512×512 (mark inside 80% safe zone)
 *   public/icons/apple-touch-icon.png   180×180
 *
 * PLACEHOLDERS — replace with designed artwork (flagged in progress.md
 * HUMAN STEPS). Regenerate after replacing logo art by editing constants.
 *
 *   npx tsx scripts/generate-pwa-icons.ts
 */
import { deflateSync } from "zlib";
import { writeFileSync, mkdirSync } from "fs";
import { resolve } from "path";

// ─── tiny PNG encoder (RGB, no alpha) ───────────────────────────────────────
const CRC_TABLE = (() => {
  const t = new Uint32Array(256);
  for (let n = 0; n < 256; n++) {
    let c = n;
    for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
    t[n] = c >>> 0;
  }
  return t;
})();

function crc32(buf: Buffer): number {
  let c = 0xffffffff;
  for (let i = 0; i < buf.length; i++) c = CRC_TABLE[(c ^ buf[i]) & 0xff] ^ (c >>> 8);
  return (c ^ 0xffffffff) >>> 0;
}

function chunk(type: string, data: Buffer): Buffer {
  const len = Buffer.alloc(4);
  len.writeUInt32BE(data.length);
  const typeBuf = Buffer.from(type, "ascii");
  const crcBuf = Buffer.alloc(4);
  crcBuf.writeUInt32BE(crc32(Buffer.concat([typeBuf, data])));
  return Buffer.concat([len, typeBuf, data, crcBuf]);
}

function encodePng(width: number, height: number, rgb: Uint8Array): Buffer {
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(width, 0);
  ihdr.writeUInt32BE(height, 4);
  ihdr[8] = 8; // bit depth
  ihdr[9] = 2; // color type: RGB
  // scanlines with filter byte 0
  const raw = Buffer.alloc(height * (1 + width * 3));
  for (let y = 0; y < height; y++) {
    const rowStart = y * (1 + width * 3);
    raw[rowStart] = 0;
    rgb.subarray(y * width * 3, (y + 1) * width * 3).forEach((v, i) => {
      raw[rowStart + 1 + i] = v;
    });
  }
  return Buffer.concat([
    Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]),
    chunk("IHDR", ihdr),
    chunk("IDAT", deflateSync(raw, { level: 9 })),
    chunk("IEND", Buffer.alloc(0)),
  ]);
}

// ─── drawing ────────────────────────────────────────────────────────────────
const BEIGE: [number, number, number] = [0xf5, 0xf1, 0xea]; // #F5F1EA
const INK: [number, number, number] = [0x1f, 0x1f, 0x1f]; // #1F1F1F
const ACCENT: [number, number, number] = [0xe0, 0xd3, 0xc3]; // beige accent

/**
 * @param size          canvas edge in px
 * @param markRatio     diameter of the dark disc as a fraction of the canvas
 *                      (maskable must keep the mark ≤ 0.8 for the safe zone)
 */
function drawIcon(size: number, markRatio: number): Buffer {
  const rgb = new Uint8Array(size * size * 3);
  const cx = size / 2;
  const cy = size / 2;
  const r = (size * markRatio) / 2;
  const innerR = r * 0.42; // inner accent dot

  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      const i = (y * size + x) * 3;
      const d = Math.hypot(x + 0.5 - cx, y + 0.5 - cy);
      let color = BEIGE;
      if (d <= r) color = INK;
      if (d <= innerR) color = ACCENT;
      rgb[i] = color[0];
      rgb[i + 1] = color[1];
      rgb[i + 2] = color[2];
    }
  }
  return encodePng(size, size, rgb);
}

// ─── write files ────────────────────────────────────────────────────────────
const outDir = resolve(process.cwd(), "public/icons");
mkdirSync(outDir, { recursive: true });

const targets: [string, number, number][] = [
  ["icon-192.png", 192, 0.78],
  ["icon-512.png", 512, 0.78],
  ["icon-maskable-512.png", 512, 0.62], // inside the 80% maskable safe zone
  ["apple-touch-icon.png", 180, 0.74],
];

for (const [name, size, ratio] of targets) {
  writeFileSync(resolve(outDir, name), drawIcon(size, ratio));
  console.log(`✓ public/icons/${name} (${size}×${size})`);
}
