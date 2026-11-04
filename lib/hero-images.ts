/**
 * lib/hero-images.ts — shared types, IST date boundary logic, and status helpers
 * for the automated hero carousel.
 */

export const MAX_HERO_IMAGES = 25;
export const HERO_MAX_UPLOAD_BYTES = 5 * 1024 * 1024; // 5 MB

export const HERO_RECOMMENDED_WIDTH = 1600;
export const HERO_RECOMMENDED_HEIGHT = 2400;
export const HERO_MIN_WIDTH = 1200;
export const HERO_MIN_HEIGHT = 1800;

export const HERO_OUTPUT_DESKTOP_WIDTH = 1200;
export const HERO_OUTPUT_MOBILE_WIDTH = 800;

export const DEFAULT_HERO_IMAGE = "/images/hero-beauty.webp";

/** Returns the current date in Asia/Kolkata (IST) in "YYYY-MM-DD" format. */
export function getTodayIST(date: Date = new Date()): string {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Kolkata",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(date);
}

/**
 * Determines whether a hero image is live at the specified point in time.
 * Date windows are start and end dates (both inclusive), evaluated in Asia/Kolkata (IST).
 */
export function isHeroImageLive(
  img: { enabled: boolean; startDate?: string | null; endDate?: string | null },
  now: Date = new Date()
): boolean {
  if (!img.enabled) return false;
  const today = getTodayIST(now);

  if (img.startDate && img.startDate > today) return false;
  if (img.endDate && img.endDate < today) return false;
  return true;
}

export type HeroImageStatusKind =
  | "live"
  | "scheduled"
  | "expired"
  | "always_on"
  | "disabled";

export interface HeroImageStatus {
  kind: HeroImageStatusKind;
  label: string;
}

/**
 * Computes the human-readable status badge for an image.
 */
export function getHeroImageStatus(
  img: { enabled: boolean; startDate?: string | null; endDate?: string | null },
  now: Date = new Date()
): HeroImageStatus {
  if (!img.enabled) {
    return { kind: "disabled", label: "Disabled" };
  }

  const today = getTodayIST(now);

  if (img.startDate && img.startDate > today) {
    return { kind: "scheduled", label: `Scheduled (starts ${img.startDate})` };
  }
  if (img.endDate && img.endDate < today) {
    return { kind: "expired", label: `Expired (ended ${img.endDate})` };
  }
  if (!img.startDate && !img.endDate) {
    return { kind: "always_on", label: "Always on" };
  }
  return { kind: "live", label: "Live now" };
}

export interface PublicHeroImage {
  id: string;
  desktopUrl: string;
  mobileUrl: string;
  blurDataUrl: string;
  alt: string;
  focalX: number;
  focalY: number;
}
