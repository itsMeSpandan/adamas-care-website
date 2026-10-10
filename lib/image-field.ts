/**
 * lib/image-field.ts — one place that decides what an uploaded photo may be.
 *
 * Profile avatars and employee photos are stored as a resized JPEG data URL on
 * the row itself. That keeps the app dependency-free (no object storage to
 * provision, no bucket credentials) and behaves identically in local dev and on
 * a serverless host, where a write to `public/` would not survive a deploy.
 *
 * The browser does the resizing, but the result comes back through the API as
 * ordinary user input, so the server re-checks it: scheme, length, and the
 * actual bytes. `data:image/svg+xml` is deliberately not accepted — an SVG can
 * carry script, and these strings are rendered straight into <img> tags.
 */

/** Rejected in the browser before any resizing happens. */
export const MAX_UPLOAD_BYTES = 5 * 1024 * 1024;

/** Longest side, in pixels, after resizing. */
export const IMAGE_MAX_EDGE = 512;

/** JPEG quality for the resize. */
export const IMAGE_JPEG_QUALITY = 0.85;

/**
 * Cap on the stored string. A 512px JPEG lands around 20-60 KB and base64
 * inflates that by roughly a third, so this is generous for a real photo while
 * keeping a hostile 8 MB base64 blob out of the row.
 */
export const MAX_IMAGE_FIELD_LENGTH = 400_000;

/**
 * A dashboard background fills the whole viewport, so it needs far more
 * pixels than an avatar. One site-wide image is worth the extra bytes.
 */
export const BACKGROUND_MAX_EDGE = 1600;
export const BACKGROUND_JPEG_QUALITY = 0.8;
export const MAX_BACKGROUND_FIELD_LENGTH = 2_000_000;

/** Only raster formats, base64-encoded, no parameters and no SVG. */
const DATA_URL_RE = /^data:image\/(jpeg|jpg|png|webp|gif);base64,([A-Za-z0-9+/]+={0,2})$/;

const ALLOWED_FORMS =
  "Upload a JPG, PNG, WebP or GIF file, or use an https:// address or a local /path";

/** base64 → bytes without Buffer, so this module stays usable in the browser. */
function base64ToBytes(base64: string): Uint8Array | null {
  try {
    const binary = atob(base64);
    const bytes = new Uint8Array(binary.length);
    for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
    return bytes;
  } catch {
    return null;
  }
}

export type ImageFieldResult =
  | { ok: true; kind: "unchanged" }
  | { ok: true; kind: "clear" }
  | { ok: true; kind: "value"; value: string }
  | { ok: false; error: string };

/**
 * Confirm the decoded bytes really are the image format the prefix claims.
 * The `data:image/jpeg` label is attacker-controlled; the first bytes are not.
 */
function magicBytesMatch(bytes: Uint8Array, mime: string): boolean {
  const startsWith = (...sig: number[]): boolean =>
    bytes.length >= sig.length && sig.every((b, i) => bytes[i] === b);

  switch (mime) {
    case "jpeg":
    case "jpg":
      return startsWith(0xff, 0xd8, 0xff);
    case "png":
      return startsWith(0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a);
    case "gif":
      // "GIF87a" / "GIF89a"
      return startsWith(0x47, 0x49, 0x46, 0x38);
    case "webp":
      // "RIFF" .... "WEBP"
      return (
        bytes.length >= 12 &&
        startsWith(0x52, 0x49, 0x46, 0x46) &&
        bytes[8] === 0x57 &&
        bytes[9] === 0x45 &&
        bytes[10] === 0x42 &&
        bytes[11] === 0x50
      );
    default:
      return false;
  }
}

/**
 * Validate the `imageUrl` / `avatarUrl` field of a request body.
 *
 * - `undefined` → the caller did not send the field; leave the stored value alone
 * - `""`        → clear it
 * - `/path`     → a local asset shipped with the app (legacy rows, placeholders)
 * - `https://…` → a remote image, kept working for rows created before uploads
 * - `data:image/…;base64,…` → an upload; length-capped and byte-checked
 *
 * Anything else (http:, javascript:, file:, remote SVG, a protocol-relative
 * `//host`) is refused rather than stored and rendered later.
 */
export function validateImageField(
  value: unknown,
  options: { maxLength?: number } = {}
): ImageFieldResult {
  const maxLength = options.maxLength ?? MAX_IMAGE_FIELD_LENGTH;

  if (value === undefined) return { ok: true, kind: "unchanged" };

  if (value === null || value === "") return { ok: true, kind: "clear" };

  if (typeof value !== "string") {
    return { ok: false, error: `Photo must be a string. ${ALLOWED_FORMS}.` };
  }

  if (value.length > maxLength) {
    const kb = Math.round(maxLength / 1000);
    return { ok: false, error: `Photo is too large to store (limit ~${kb} KB after resizing).` };
  }

  // Local path — but not "//evil.example.com", which is a protocol-relative URL.
  if (value.startsWith("/") && !value.startsWith("//")) {
    return { ok: true, kind: "value", value };
  }

  if (value.startsWith("https://")) {
    return { ok: true, kind: "value", value };
  }

  const dataUrl = DATA_URL_RE.exec(value);
  if (dataUrl) {
    const [, mime, base64] = dataUrl;

    const bytes = base64ToBytes(base64);
    if (!bytes) {
      return { ok: false, error: `Photo data could not be decoded. ${ALLOWED_FORMS}.` };
    }

    if (bytes.length === 0) {
      return { ok: false, error: `Photo data is empty. ${ALLOWED_FORMS}.` };
    }
    if (!magicBytesMatch(bytes, mime)) {
      return {
        ok: false,
        error: `That file is not a real ${mime.toUpperCase()} image. ${ALLOWED_FORMS}.`,
      };
    }

    return { ok: true, kind: "value", value };
  }

  return { ok: false, error: `Unsupported photo value. ${ALLOWED_FORMS}.` };
}

/**
 * Read a picked file, scale it down to fit `maxEdge`, and return a JPEG data
 * URL. Browser-only: it needs FileReader and a canvas.
 */
export function resizeImageToDataUrl(
  file: File,
  options: { maxEdge?: number; quality?: number } = {}
): Promise<string> {
  const maxEdge = options.maxEdge ?? IMAGE_MAX_EDGE;
  const quality = options.quality ?? IMAGE_JPEG_QUALITY;

  return new Promise((resolve, reject) => {
    const reader = new FileReader();

    reader.onload = (event) => {
      const image = new window.Image();

      image.onload = () => {
        let { width, height } = image;
        if (width >= height && width > maxEdge) {
          height = Math.round((height * maxEdge) / width);
          width = maxEdge;
        } else if (height > maxEdge) {
          width = Math.round((width * maxEdge) / height);
          height = maxEdge;
        }

        const canvas = document.createElement("canvas");
        canvas.width = width;
        canvas.height = height;

        const ctx = canvas.getContext("2d");
        if (!ctx) {
          reject(new Error("Failed to get canvas context"));
          return;
        }

        ctx.drawImage(image, 0, 0, width, height);
        resolve(canvas.toDataURL("image/jpeg", quality));
      };

      image.onerror = () => reject(new Error("Failed to load image"));
      image.src = event.target?.result as string;
    };

    reader.onerror = () => reject(new Error("Failed to read file"));
    reader.readAsDataURL(file);
  });
}

/**
 * Resize, then keep shrinking until the encoded result fits under `maxLength`.
 *
 * A full-width background can blow past a byte budget at one size and fit
 * comfortably at the next, so the caller should not have to guess an edge.
 * Throws when even the smallest attempt is too large, which lets the UI show a
 * real message instead of silently storing an oversized string.
 */
export async function resizeImageToDataUrlUnderCap(
  file: File,
  options: { maxEdge?: number; quality?: number; maxLength?: number } = {}
): Promise<string> {
  const maxEdge = options.maxEdge ?? BACKGROUND_MAX_EDGE;
  const maxLength = options.maxLength ?? MAX_BACKGROUND_FIELD_LENGTH;
  const quality = options.quality ?? BACKGROUND_JPEG_QUALITY;

  const edges = [maxEdge, Math.round(maxEdge * 0.8), Math.round(maxEdge * 0.6), maxEdge / 2];
  let encoded = "";

  for (const edge of edges) {
    encoded = await resizeImageToDataUrl(file, { maxEdge: edge, quality });
    if (encoded.length <= maxLength) return encoded;
  }

  throw new Error("Image is too detailed to fit after resizing — try a smaller or simpler picture.");
}

/**
 * Initials avatar used when there is no uploaded photo — the same placeholder
 * the register and Google sign-in flows store on User.avatarUrl.
 */
export function generatedAvatarUrl(name: string): string {
  return `https://ui-avatars.com/api/?name=${encodeURIComponent(name || "Team Member")}&background=e8ddd3&color=7c6e5a`;
}

/** Client-side pre-check so an oversized pick never reaches the resizer. */
export function checkPickedFile(file: File): string | null {
  if (!file.type.startsWith("image/")) return "Please choose an image file.";
  if (file.type === "image/svg+xml") return "SVG files are not supported — use a JPG, PNG or WebP.";
  if (file.size > MAX_UPLOAD_BYTES) {
    return `That image is ${(file.size / 1024 / 1024).toFixed(1)} MB — the limit is 5 MB.`;
  }
  return null;
}
