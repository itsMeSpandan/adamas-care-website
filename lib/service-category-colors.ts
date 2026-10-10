/**
 * lib/service-category-colors.ts — one colour per service category.
 *
 * The category list lives in lib/types.ts and the salon's price list is the
 * source of those values. Any view that tints a card, a legend or a booking
 * block by category reads from here, so adding a menu section means editing
 * one map instead of hunting for per-screen copies.
 *
 * `categoryColors()` never returns undefined: a booking whose service was
 * removed (Booking.serviceId is nullable and clears on delete) or a category
 * the app doesn't know falls back to a neutral beige instead of throwing.
 */

export interface CategoryColors {
  bg: string;
  text: string;
  /** Full border, e.g. "border-emerald-200". */
  border: string;
  /** Left accent only, e.g. "border-l-emerald-400". */
  borderLeft: string;
}

export const CATEGORY_COLORS: Record<string, CategoryColors> = {
  "Classic Combos": {
    bg: "bg-indigo-100",
    text: "text-indigo-800",
    border: "border-indigo-200",
    borderLeft: "border-l-indigo-400",
  },
  "Fab Facials": {
    bg: "bg-rose-100",
    text: "text-rose-800",
    border: "border-rose-200",
    borderLeft: "border-l-rose-400",
  },
  "Grooming Him": {
    bg: "bg-sky-100",
    text: "text-sky-800",
    border: "border-sky-200",
    borderLeft: "border-l-sky-400",
  },
  "Styling Her": {
    bg: "bg-fuchsia-100",
    text: "text-fuchsia-800",
    border: "border-fuchsia-200",
    borderLeft: "border-l-fuchsia-400",
  },
  Bleach: {
    bg: "bg-yellow-100",
    text: "text-yellow-800",
    border: "border-yellow-200",
    borderLeft: "border-l-yellow-400",
  },
  Waxing: {
    bg: "bg-violet-100",
    text: "text-violet-800",
    border: "border-violet-200",
    borderLeft: "border-l-violet-400",
  },
  Threading: {
    bg: "bg-teal-100",
    text: "text-teal-800",
    border: "border-teal-200",
    borderLeft: "border-l-teal-400",
  },
  "Hands & Feet": {
    bg: "bg-orange-100",
    text: "text-orange-800",
    border: "border-orange-200",
    borderLeft: "border-l-orange-400",
  },
  "Relaxing Spa": {
    bg: "bg-emerald-100",
    text: "text-emerald-800",
    border: "border-emerald-200",
    borderLeft: "border-l-emerald-400",
  },
  "Mini Massage": {
    bg: "bg-amber-100",
    text: "text-amber-800",
    border: "border-amber-200",
    borderLeft: "border-l-amber-400",
  },
};

/** Neutral tint for a booking whose service is gone or a category we don't know. */
export const FALLBACK_CATEGORY_COLORS: CategoryColors = {
  bg: "bg-beige-100",
  text: "text-beige-700",
  border: "border-beige-200",
  borderLeft: "border-l-beige-300",
};

export function categoryColors(category?: string | null): CategoryColors {
  if (!category) return FALLBACK_CATEGORY_COLORS;
  return CATEGORY_COLORS[category] ?? FALLBACK_CATEGORY_COLORS;
}
