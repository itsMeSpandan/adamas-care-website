import { describe, it, expect } from "vitest";
import {
  isBookingEligibleForFeedback,
  calculateNps,
  isLowRating,
  sanitizeComment,
  escapeCsvCell,
  shouldSendFeedbackReminderNow,
  FEEDBACK_SUBMISSION_WINDOW_DAYS,
  NPS_MIN_SAMPLE_SIZE,
} from "@/lib/feedback";

describe("Post-Visit Feedback System", () => {
  describe("Eligibility Logic", () => {
    it("rejects bookings that are not in completed status", () => {
      const res = isBookingEligibleForFeedback({
        status: "confirmed",
        userId: "user_123",
        date: new Date(),
      });
      expect(res.eligible).toBe(false);
      expect(res.reason).toContain("only available after a visit is completed");
    });

    it("rejects guest bookings without a registered account (userId === null)", () => {
      const res = isBookingEligibleForFeedback({
        status: "completed",
        userId: null,
        completedAt: new Date(),
        date: new Date(),
      });
      expect(res.eligible).toBe(false);
      expect(res.reason).toContain("requires an account");
    });

    it("accepts completed bookings within the 14-day window", () => {
      const res = isBookingEligibleForFeedback({
        status: "completed",
        userId: "user_123",
        completedAt: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000), // 2 days ago
        date: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000),
      });
      expect(res.eligible).toBe(true);
    });

    it("rejects completed bookings that exceed the 14-day window", () => {
      const fifteenDaysAgo = new Date(Date.now() - 15 * 24 * 60 * 60 * 1000);
      const res = isBookingEligibleForFeedback({
        status: "completed",
        userId: "user_123",
        completedAt: fifteenDaysAgo,
        date: fifteenDaysAgo,
      });
      expect(res.eligible).toBe(false);
      expect(res.reason).toContain("expired");
    });

    it("rejects bookings that already have feedback submitted", () => {
      const res = isBookingEligibleForFeedback({
        status: "completed",
        userId: "user_123",
        completedAt: new Date(),
        date: new Date(),
        feedback: { id: "fb_already_exists" },
      });
      expect(res.eligible).toBe(false);
      expect(res.reason).toContain("already been submitted");
    });
  });

  describe("NPS Calculation & Minimum Sample Rules", () => {
    it("returns null score when total samples are less than minimum (10)", () => {
      const smallSample = [10, 9, 8, 7, 6]; // 5 responses
      const res = calculateNps(smallSample);
      expect(res.hasMinimumSample).toBe(false);
      expect(res.score).toBeNull();
      expect(res.total).toBe(5);
    });

    it("calculates accurate NPS when at or above minimum sample size", () => {
      // 10 responses: 7 Promoters (9-10), 2 Passives (7-8), 1 Detractor (0-6)
      // NPS = ((7 - 1) / 10) * 100 = +60
      const sample = [10, 10, 10, 9, 9, 9, 9, 8, 7, 2];
      const res = calculateNps(sample);
      expect(res.hasMinimumSample).toBe(true);
      expect(res.total).toBe(10);
      expect(res.promoters).toBe(7);
      expect(res.passives).toBe(2);
      expect(res.detractors).toBe(1);
      expect(res.score).toBe(60);
    });

    it("handles 100% promoters and 100% detractors correctly", () => {
      const allPromoters = Array(12).fill(10);
      expect(calculateNps(allPromoters).score).toBe(100);

      const allDetractors = Array(12).fill(4);
      expect(calculateNps(allDetractors).score).toBe(-100);
    });
  });

  describe("Low-Rating Threshold Flagging (<= 2 stars)", () => {
    it("flags when overall rating is <= 2", () => {
      expect(isLowRating(2)).toBe(true);
      expect(isLowRating(1)).toBe(true);
      expect(isLowRating(3)).toBe(false);
    });

    it("flags when overall rating is high but an employee rating is <= 2", () => {
      const flagged = isLowRating(4, [{ rating: 2 }]);
      expect(flagged).toBe(true);
    });

    it("flags when overall and employee are high but a service rating is <= 2", () => {
      const flagged = isLowRating(5, [{ rating: 5 }], [{ rating: 1 }]);
      expect(flagged).toBe(true);
    });

    it("does not flag when all ratings are 3 or above", () => {
      const flagged = isLowRating(5, [{ rating: 4 }, { rating: 5 }], [{ rating: 3 }]);
      expect(flagged).toBe(false);
    });
  });

  describe("Comment Sanitization & Security", () => {
    it("strips HTML tags and script injections", () => {
      const dirty = "<script>alert('xss')</script>Amazing cut <b>and</b> styling!";
      const clean = sanitizeComment(dirty);
      expect(clean).toBe("alert('xss')Amazing cut and styling!");
      expect(clean).not.toContain("<script>");
      expect(clean).not.toContain("<b>");
    });

    it("trims whitespace and returns null for empty comments", () => {
      expect(sanitizeComment("   ")).toBeNull();
      expect(sanitizeComment(null)).toBeNull();
      expect(sanitizeComment(undefined)).toBeNull();
    });
  });

  describe("CSV Formula Injection Protection", () => {
    it("prepends single quote to dangerous spreadsheet formula characters", () => {
      expect(escapeCsvCell("=SUM(A1:A10)")).toBe("\"'=SUM(A1:A10)\"");
      expect(escapeCsvCell("+12345")).toBe("\"'+12345\"");
      expect(escapeCsvCell("-500")).toBe("\"'-500\"");
      expect(escapeCsvCell("@cmd")).toBe("\"'@cmd\"");
    });

    it("handles benign text without formula prefix", () => {
      expect(escapeCsvCell("Great service")).toBe('"Great service"');
    });

    it("escapes internal quotes properly", () => {
      expect(escapeCsvCell('Loved the "signature" facial')).toBe('"Loved the ""signature"" facial"');
    });

    it("handles null and undefined gracefully", () => {
      expect(escapeCsvCell(null)).toBe('""');
      expect(escapeCsvCell(undefined)).toBe('""');
    });
  });

  describe("Reminder IST Timing Rules", () => {
    it("does not send reminder if less than 2.8 hours have passed", () => {
      const completedAt = new Date("2026-11-01T08:00:00.000Z"); // 13:30 IST
      const now = new Date("2026-11-01T09:30:00.000Z"); // 1.5h later
      expect(shouldSendFeedbackReminderNow(completedAt, now)).toBe(false);
    });

    it("does not send during the night quiet window (after 20:00 IST)", () => {
      // 21:00 IST is 15:30 UTC
      const nowNight = new Date("2026-11-01T15:30:00.000Z");
      const completedAt = new Date("2026-11-01T10:00:00.000Z"); // 5.5h ago
      expect(shouldSendFeedbackReminderNow(completedAt, nowNight)).toBe(false);
    });

    it("sends during daytime (e.g. 14:00 IST) when > 3 hours have passed", () => {
      // 14:00 IST is 08:30 UTC
      const nowDay = new Date("2026-11-01T08:30:00.000Z");
      const completedAt = new Date("2026-11-01T05:00:00.000Z"); // 3.5h ago (10:30 IST)
      expect(shouldSendFeedbackReminderNow(completedAt, nowDay)).toBe(true);
    });

    it("delays visits completed after 17:00 IST until after 10:00 IST next day", () => {
      // Visit completed at 18:30 IST (13:00 UTC)
      const completedEvening = new Date("2026-11-01T13:00:00.000Z");

      // Next morning at 09:30 IST (04:00 UTC) -> should wait until 10:00
      const morningTooEarly = new Date("2026-11-02T04:00:00.000Z");
      expect(shouldSendFeedbackReminderNow(completedEvening, morningTooEarly)).toBe(false);

      // Next morning at 10:15 IST (04:45 UTC) -> eligible!
      const morningEligible = new Date("2026-11-02T04:45:00.000Z");
      expect(shouldSendFeedbackReminderNow(completedEvening, morningEligible)).toBe(true);
    });
  });
});
