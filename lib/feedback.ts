import { z } from "zod";

export const FEEDBACK_SUBMISSION_WINDOW_DAYS = 14;
export const LOW_RATING_THRESHOLD = 2;
export const EMPLOYEE_MIN_SAMPLE_SIZE = 5;
export const SERVICE_MIN_SAMPLE_SIZE = 5;
export const NPS_MIN_SAMPLE_SIZE = 10;

export const EMPLOYEE_QUICK_TAGS = [
  "Professional",
  "Punctual",
  "Friendly",
  "Skilled",
  "Gentle",
  "Attentive",
  "Thorough",
];

export const SERVICE_QUICK_TAGS = [
  "Great results",
  "Value for money",
  "Comfortable",
  "Relaxing",
  "High quality",
  "Quick service",
];

export const OVERALL_QUICK_TAGS = [
  "Cleanliness",
  "Ambience",
  "Booking experience",
  "Staff courtesy",
  "Pricing",
  "Hygienic setup",
  "Warm hospitality",
];

/**
 * Checks whether a booking is eligible to receive customer feedback.
 * Requirements:
 * 1. Must be completed (`status === 'completed'`)
 * 2. Must belong to a registered account holder (`userId != null`, guests excluded)
 * 3. Must be within the 14-day submission window from `completedAt` (falling back to `date`).
 */
export function isBookingEligibleForFeedback(booking: {
  status: string;
  userId: string | null;
  completedAt?: Date | null;
  date: Date;
  feedback?: { id: string } | null;
}): { eligible: boolean; reason?: string } {
  if (booking.feedback) {
    return { eligible: false, reason: "Feedback has already been submitted for this visit" };
  }

  if (booking.status !== "completed") {
    return { eligible: false, reason: "Feedback is only available after a visit is completed" };
  }

  if (!booking.userId) {
    return { eligible: false, reason: "Feedback requires an account" };
  }

  const completionInstant = booking.completedAt ? new Date(booking.completedAt).getTime() : new Date(booking.date).getTime();
  const windowMs = FEEDBACK_SUBMISSION_WINDOW_DAYS * 24 * 60 * 60 * 1000;
  const now = Date.now();

  if (now - completionInstant > windowMs) {
    return { eligible: false, reason: `The 14-day feedback window has expired` };
  }

  return { eligible: true };
}

/**
 * Returns current hour in Asia/Kolkata (IST) time (0 - 23).
 */
export function getIstHour(d: Date = new Date()): number {
  const istTime = new Date(d.getTime() + 330 * 60_000);
  return istTime.getUTCHours();
}

/**
 * Evaluates whether a post-visit feedback reminder should be sent right now.
 * Rules (Decision 5):
 * - ~3 hours after completedAt
 * - Only within 09:00 - 20:00 IST
 * - If completed late evening / night (after 17:00 IST), delayed until next 10:00 IST
 * - Within the 14-day window
 */
export function shouldSendFeedbackReminderNow(completedAt: Date, now: Date = new Date()): boolean {
  const hoursSince = (now.getTime() - completedAt.getTime()) / (1000 * 60 * 60);

  // Must be at least ~3 hours (2.8h tolerance for cron interval) and within 14 days
  if (hoursSince < 2.8 || hoursSince > FEEDBACK_SUBMISSION_WINDOW_DAYS * 24) {
    return false;
  }

  const istHour = getIstHour(now);

  // Night quiet window (no messages between 20:00 and 09:00 IST)
  if (istHour < 9 || istHour >= 20) {
    return false;
  }

  // If completed late in the evening and held overnight, only send after 10:00 IST
  const completedIstHour = getIstHour(completedAt);
  if (completedIstHour >= 17 && istHour < 10) {
    return false;
  }

  return true;
}

/**
 * Strips HTML tags and excessive whitespace from user comments.
 */
export function sanitizeComment(text?: string | null): string | null {
  if (!text) return null;
  // Remove HTML tags
  const clean = text.replace(/<[^>]*>/g, "").trim();
  return clean.length > 0 ? clean : null;
}

/**
 * Checks if a rating meets the low-rating threshold (<= 2 stars).
 */
export function isLowRating(
  overallRating: number,
  employeeRatings?: { rating: number }[],
  serviceRatings?: { rating: number }[]
): boolean {
  if (overallRating <= LOW_RATING_THRESHOLD) return true;
  if (employeeRatings?.some((r) => r.rating <= LOW_RATING_THRESHOLD)) return true;
  if (serviceRatings?.some((r) => r.rating <= LOW_RATING_THRESHOLD)) return true;
  return false;
}

/**
 * Calculates Net Promoter Score (NPS).
 * Returns null score if total responses < NPS_MIN_SAMPLE_SIZE (10).
 */
export function calculateNps(scores: (number | null | undefined)[]): {
  score: number | null;
  promoters: number;
  passives: number;
  detractors: number;
  total: number;
  hasMinimumSample: boolean;
} {
  const validScores = scores.filter((s): s is number => typeof s === "number" && s >= 0 && s <= 10);
  const total = validScores.length;

  if (total === 0) {
    return { score: null, promoters: 0, passives: 0, detractors: 0, total: 0, hasMinimumSample: false };
  }

  let promoters = 0;
  let passives = 0;
  let detractors = 0;

  for (const s of validScores) {
    if (s >= 9) promoters++;
    else if (s >= 7) passives++;
    else detractors++;
  }

  const hasMinimumSample = total >= NPS_MIN_SAMPLE_SIZE;
  const score = hasMinimumSample ? Math.round(((promoters - detractors) / total) * 100) : null;

  return {
    score,
    promoters,
    passives,
    detractors,
    total,
    hasMinimumSample,
  };
}

/**
 * Formula injection protection for CSV export.
 * Neutralizes values starting with '=', '+', '-', '@', tab, or carriage return.
 */
export function escapeCsvCell(raw: unknown): string {
  if (raw === null || raw === undefined) return '""';
  let str = String(raw).trim();

  // If starts with potentially dangerous formula prefix in Excel / Google Sheets
  if (/^[=+\-@\t\r]/.test(str)) {
    str = `'${str}`;
  }

  // Escape inner double quotes
  str = str.replace(/"/g, '""');
  return `"${str}"`;
}

// ─── Zod Schemas ─────────────────────────────────────────────────────────────

export const feedbackEmployeeInputSchema = z.object({
  employeeId: z.string().min(1, "Employee ID is required"),
  rating: z.number().int().min(1).max(5),
  tags: z.array(z.string().max(50)).max(10).default([]),
  comment: z.string().max(500).optional().nullable(),
});

export const feedbackServiceInputSchema = z.object({
  serviceId: z.string().min(1, "Service ID is required"),
  rating: z.number().int().min(1).max(5),
  tags: z.array(z.string().max(50)).max(10).default([]),
  comment: z.string().max(500).optional().nullable(),
});

export const feedbackSubmissionSchema = z.object({
  bookingId: z.string().min(1, "Booking ID is required"),
  overallRating: z.number().int().min(1).max(5),
  npsScore: z.number().int().min(0).max(10).optional().nullable(),
  overallTags: z.array(z.string().max(50)).max(10).default([]),
  overallComment: z.string().max(1000).optional().nullable(),
  employeeRatings: z.array(feedbackEmployeeInputSchema).optional().default([]),
  serviceRatings: z.array(feedbackServiceInputSchema).optional().default([]),
});

export const adminFeedbackUpdateSchema = z.object({
  status: z.enum(["NEW", "REVIEWED", "FOLLOW_UP", "RESOLVED"]).optional(),
  adminNotes: z.string().max(2000).optional().nullable(),
});
