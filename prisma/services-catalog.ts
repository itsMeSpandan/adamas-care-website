/**
 * prisma/services-catalog.ts — the salon's real service menu, parsed from the
 * owner's price list (`prisma/data/grace_salon_services.csv`).
 *
 * The CSV is the source of truth for name, category, price, duration, variant
 * and gender. This module turns each row into a service and records why any row
 * was left out, so `scripts/import-services.ts` can report exactly what the
 * catalog does and doesn't contain.
 *
 * Rules (agreed with the owner):
 *   - A row is imported only when the menu lists a duration. Bookings reserve a
 *     real slot from that number, so a guessed duration would invent capacity
 *     the salon doesn't have. Rows without one are reported, not defaulted.
 *   - A row is imported only when the menu lists a price (one 60-minute head
 *     massage is marked "NA" — it can't be booked at a price we don't know).
 *   - Variants are separate services: rows that differ only by variant or
 *     duration each become their own service at their own price.
 *   - `gender` maps straight onto the service audience (see lib/service-audience.ts).
 *
 * No images or copy exist in the CSV, so descriptions are written per treatment
 * below and images are placeholders until the salon supplies real photography.
 *
 * Node-only (reads a file). Imported by prisma/seed.ts and scripts/, never by
 * the Next.js app.
 */

import { readFileSync } from "node:fs";
import path from "node:path";

export type CatalogAudience = "male" | "female" | "unisex";

export interface CatalogService {
  id: string;
  name: string;
  category: string;
  description: string;
  longDescription: string;
  durationMinutes: number;
  price: number;
  imageUrl: string;
  featured: boolean;
  audience: CatalogAudience;
  employeeIds: string[];
}

export interface SkippedRow {
  category: string;
  service: string;
  gender: string;
  reason: string;
}

export interface Catalog {
  services: CatalogService[];
  skipped: SkippedRow[];
}

const CSV_PATH = path.resolve(
  process.cwd(),
  "prisma/data/grace_salon_services.csv"
);

/** Every service is offered by every specialist until the roster says otherwise. */
export const ALL_EMPLOYEE_IDS = [
  "priya-sharma",
  "kavya-iyer",
  "rahul-verma",
  "arjun-mehta",
];

/**
 * Minimal RFC 4180 reader: quoted fields, escaped quotes, CRLF, and the BOM
 * this file starts with. `,` inside quoted values (e.g. "Head, Neck & Shoulder
 * Massage") must not split a row.
 */
export function parseCsv(text: string): string[][] {
  const rows: string[][] = [];
  let row: string[] = [];
  let field = "";
  let inQuotes = false;
  const src = text.replace(/^\uFEFF/, "");

  for (let i = 0; i < src.length; i++) {
    const ch = src[i];

    if (inQuotes) {
      if (ch === '"') {
        if (src[i + 1] === '"') {
          field += '"';
          i++;
        } else {
          inQuotes = false;
        }
      } else {
        field += ch;
      }
      continue;
    }

    if (ch === '"') {
      inQuotes = true;
    } else if (ch === ",") {
      row.push(field);
      field = "";
    } else if (ch === "\n") {
      row.push(field);
      rows.push(row);
      row = [];
      field = "";
    } else if (ch !== "\r") {
      field += ch;
    }
  }
  if (field.length > 0 || row.length > 0) {
    row.push(field);
    rows.push(row);
  }
  return rows.filter((r) => r.some((c) => c.trim() !== ""));
}

function slugify(value: string): string {
  return value
    .toLowerCase()
    .replace(/&/g, " and ")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

function toAudience(gender: string): CatalogAudience {
  const g = gender.trim().toLowerCase();
  if (g === "male") return "male";
  if (g === "female") return "female";
  return "unisex";
}

/**
 * Copy per treatment, keyed by the menu's service name. The CSV has no
 * descriptions, and generated filler reads like filler, so these are written
 * for the treatments the salon actually lists.
 */
const COPY: Record<string, { short: string; long: string }> = {
  "Deep Tissue Massage": {
    short:
      "Firm, sustained pressure through the deepest muscle layers to release chronic tension and knots.",
    long: "Our deep tissue massage uses slow strokes and sustained pressure to reach the deepest layers of muscle and connective tissue. Expect firm work across the back, shoulders and legs, and a genuine release of long-held tension. Best for chronic aches, desk-bound shoulders and post-training tightness.",
  },
  "Swedish Massage": {
    short:
      "Classic full-body relaxation massage with long, flowing strokes and warm oil.",
    long: "The classic relaxation massage: long gliding strokes, kneading and gentle joint movement with warm oil, worked at a pace that lets the nervous system settle. Choose it when you want to switch off completely rather than work on one specific problem.",
  },
  Aromatherapy: {
    short:
      "Relaxing massage with a blended essential oil chosen for your mood.",
    long: "A full-body massage using a blended essential oil chosen with you beforehand — lavender and chamomile to unwind, citrus and peppermint to lift. The aroma carries the session, so it is as much about switching off as it is about the muscles.",
  },
  "Body Polishing": {
    short: "Full-body exfoliation that leaves skin smooth, bright and glowing.",
    long: "A full-body polish with a fine-grained scrub that lifts away dead cells, followed by a moisturising massage. Skin is left noticeably smoother and brighter — ideal before an event or as a seasonal reset.",
  },
  "Full Body Scrubbing": {
    short:
      "Deep-cleansing full-body scrub to smooth and refresh the skin.",
    long: "A thorough, invigorating body scrub that removes dead skin and stimulates circulation, finishing with a hydrating wash-down. Leaves skin clean, smooth and refreshed.",
  },
  "Thai Massage": {
    short:
      "Traditional assisted-stretch massage on a mat, working through the whole body.",
    long: "Traditional Thai massage is done on a padded mat, fully clothed and without oil. Your therapist uses palms, thumbs, forearms, elbows and feet to compress along the energy lines and takes you through assisted stretches. Firm and energising rather than relaxing.",
  },
  "Head Massage": {
    short:
      "Indian head massage releasing tension across the scalp, neck and shoulders.",
    long: "A traditional Indian head massage working across the scalp, temples, neck and shoulders. Extremely effective for headaches, eye strain and the tight band of tension that builds across the shoulders during long days.",
  },
  "Head, Neck & Shoulder Massage": {
    short:
      "Targeted work on the places stress collects — head, neck and shoulders.",
    long: "Concentrated massage for the spots desk work and long journeys tighten first: the base of the skull, the neck and the tops of the shoulders. A short, focused session that can undo a week of stiffness.",
  },
  "Foot Massage": {
    short: "Restorative massage of the feet and lower legs.",
    long: "A restorative massage for tired feet and lower legs, working through the arches and calves to ease heaviness after long days on your feet.",
  },
  "Foot Reflexology": {
    short: "Pressure-point work on the feet, mapped to the whole body.",
    long: "Reflexology applies precise pressure to points on the soles and sides of the feet that correspond to systems across the body. Deeply calming, and prized by regulars for better sleep and digestion.",
  },
};

/**
 * Placeholder photography. The CSV carries no images; these are the salon's
 * existing body-treatment shots, reused until real ones are supplied.
 */
const IMAGES: Record<string, string> = {
  "Deep Tissue Massage": "/images/photo-1544161515-4ab6ce6db874",
  "Thai Massage": "/images/photo-1544161515-4ab6ce6db874",
  "Body Polishing": "/images/photo-1544161515-4ab6ce6db874",
  "Swedish Massage": "/images/photo-1515377905703-c4788e51af15",
  Aromatherapy: "/images/photo-1515377905703-c4788e51af15",
  "Full Body Scrubbing": "/images/photo-1515377905703-c4788e51af15",
  "Head Massage": "/images/photo-1515377905703-c4788e51af15",
  "Head, Neck & Shoulder Massage": "/images/photo-1515377905703-c4788e51af15",
  "Foot Massage": "/images/photo-1544161515-4ab6ce6db874",
  "Foot Reflexology": "/images/photo-1544161515-4ab6ce6db874",
};

const FALLBACK_IMAGE = "/images/photo-1544161515-4ab6ce6db874";

/** Which services lead the marketing grid. */
const FEATURED = new Set([
  "deep-tissue-massage-60",
  "swedish-massage-60",
  "head-massage",
]);

interface RawRow {
  category: string;
  service: string;
  gender: string;
  price: string;
  duration: string;
  variant: string;
  notes: string;
}

function readRows(): RawRow[] {
  const rows = parseCsv(readFileSync(CSV_PATH, "utf8"));
  const [header, ...body] = rows;
  const index = Object.fromEntries(header.map((h, i) => [h.trim(), i]));

  return body.map((row) => ({
    category: (row[index.category] ?? "").trim(),
    service: (row[index.service] ?? "").trim(),
    gender: (row[index.gender] ?? "").trim(),
    price: (row[index.price_inr] ?? "").trim(),
    duration: (row[index.duration_minutes] ?? "").trim(),
    variant: (row[index.variant] ?? "").trim(),
    notes: (row[index.notes] ?? "").trim(),
  }));
}

export function buildCatalog(): Catalog {
  const services: CatalogService[] = [];
  const skipped: SkippedRow[] = [];
  const rows = readRows();

  // How many rows share each service name — a name offered at two durations
  // needs the duration in its display name so customers can tell them apart.
  const nameCounts = new Map<string, number>();
  for (const r of rows) {
    if (r.duration && r.price) {
      nameCounts.set(r.service, (nameCounts.get(r.service) ?? 0) + 1);
    }
  }

  for (const row of rows) {
    if (!row.duration) {
      skipped.push({
        category: row.category,
        service: row.service,
        gender: row.gender,
        reason: "no duration listed on the menu",
      });
      continue;
    }
    if (!row.price) {
      skipped.push({
        category: row.category,
        service: row.service,
        gender: row.gender,
        reason: "no price listed on the menu",
      });
      continue;
    }

    const durationMinutes = Number(row.duration);
    const price = Number(row.price);
    if (!Number.isFinite(durationMinutes) || !Number.isFinite(price)) {
      skipped.push({
        category: row.category,
        service: row.service,
        gender: row.gender,
        reason: "unreadable duration or price",
      });
      continue;
    }

    const isVariant = row.variant !== "";
    const repeated = (nameCounts.get(row.service) ?? 0) > 1;
    const name = isVariant
      ? `${row.service} — ${row.variant}`
      : repeated
      ? `${row.service} (${durationMinutes} min)`
      : row.service;
    const id = isVariant
      ? `${slugify(row.service)}-${slugify(row.variant)}`
      : repeated
      ? `${slugify(row.service)}-${durationMinutes}`
      : slugify(row.service);

    const copy = COPY[row.service] ?? {
      short: `${row.service} — a ${durationMinutes}-minute ${row.category} treatment.`,
      long: `${row.service} is a ${durationMinutes}-minute treatment from our ${row.category} menu.`,
    };

    services.push({
      id,
      name,
      category: row.category,
      description: copy.short,
      longDescription: copy.long,
      durationMinutes,
      price,
      imageUrl: IMAGES[row.service] ?? FALLBACK_IMAGE,
      featured: FEATURED.has(id),
      audience: toAudience(row.gender),
      employeeIds: [...ALL_EMPLOYEE_IDS],
    });
  }

  return { services, skipped };
}

/** Every category the price list uses, in menu order. */
export function catalogCategories(): string[] {
  const seen: string[] = [];
  for (const row of readRows()) {
    if (!seen.includes(row.category)) seen.push(row.category);
  }
  return seen;
}
