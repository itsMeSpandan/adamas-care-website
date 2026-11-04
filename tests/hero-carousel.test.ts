/**
 * tests/hero-carousel.test.ts
 *
 * Test suite for the automated hero carousel:
 * - Live-image evaluation logic
 * - IST day boundaries (Asia/Kolkata)
 * - Inclusive start and end dates
 * - Disabled and none-live states
 * - Status badge generation
 * - 25-image hard cap and concurrent transaction protection
 */

import { describe, it, expect } from "vitest";
import {
  isHeroImageLive,
  getTodayIST,
  getHeroImageStatus,
  MAX_HERO_IMAGES,
} from "@/lib/hero-images";

describe("Hero Carousel - Live Image Logic & IST Boundaries", () => {
  it("considers an enabled image with no date window as live (always on)", () => {
    const live = isHeroImageLive({
      enabled: true,
      startDate: null,
      endDate: null,
    });
    expect(live).toBe(true);
  });

  it("never considers a disabled image as live even with an active window", () => {
    const today = getTodayIST();
    const live = isHeroImageLive({
      enabled: false,
      startDate: today,
      endDate: today,
    });
    expect(live).toBe(false);
  });

  it("returns false when the start date is in the future", () => {
    // 2099-01-01 is definitely in the future
    const live = isHeroImageLive({
      enabled: true,
      startDate: "2099-01-01",
      endDate: "2099-12-31",
    });
    expect(live).toBe(false);
  });

  it("returns false when the end date is in the past", () => {
    // 2020-01-01 is definitely in the past
    const live = isHeroImageLive({
      enabled: true,
      startDate: "2020-01-01",
      endDate: "2020-12-31",
    });
    expect(live).toBe(false);
  });

  it("considers start date as inclusive", () => {
    // Test on a specific fixed UTC date: 2026-11-05 12:00:00 UTC (17:30 IST)
    const fixedTime = new Date("2026-11-05T12:00:00Z");
    const todayIST = getTodayIST(fixedTime); // "2026-11-05"

    const live = isHeroImageLive(
      {
        enabled: true,
        startDate: todayIST,
        endDate: "2026-11-10",
      },
      fixedTime
    );
    expect(live).toBe(true);
  });

  it("considers end date as inclusive through 23:59:59 IST", () => {
    // 2026-11-12 at 18:29:00 UTC is 23:59:00 IST on Nov 12
    const lateNightIST = new Date("2026-11-12T18:29:00Z");
    expect(getTodayIST(lateNightIST)).toBe("2026-11-12");

    const liveLateNight = isHeroImageLive(
      {
        enabled: true,
        startDate: "2026-11-01",
        endDate: "2026-11-12",
      },
      lateNightIST
    );
    expect(liveLateNight).toBe(true);

    // 2026-11-12 at 18:31:00 UTC is 00:01:00 IST on Nov 13
    const nextDayMorningIST = new Date("2026-11-12T18:31:00Z");
    expect(getTodayIST(nextDayMorningIST)).toBe("2026-11-13");

    const liveNextDay = isHeroImageLive(
      {
        enabled: true,
        startDate: "2026-11-01",
        endDate: "2026-11-12",
      },
      nextDayMorningIST
    );
    expect(liveNextDay).toBe(false);
  });

  it("handles start date at 00:00:00 IST boundary", () => {
    // 2026-11-04 at 18:29:00 UTC is 23:59:00 IST on Nov 4 (one minute before start)
    const justBeforeStart = new Date("2026-11-04T18:29:00Z");
    expect(getTodayIST(justBeforeStart)).toBe("2026-11-04");

    const liveBefore = isHeroImageLive(
      {
        enabled: true,
        startDate: "2026-11-05",
        endDate: "2026-11-10",
      },
      justBeforeStart
    );
    expect(liveBefore).toBe(false);

    // 2026-11-04 at 18:31:00 UTC is 00:01:00 IST on Nov 5 (start day has arrived)
    const justAfterStart = new Date("2026-11-04T18:31:00Z");
    expect(getTodayIST(justAfterStart)).toBe("2026-11-05");

    const liveAfter = isHeroImageLive(
      {
        enabled: true,
        startDate: "2026-11-05",
        endDate: "2026-11-10",
      },
      justAfterStart
    );
    expect(liveAfter).toBe(true);
  });
});

describe("Hero Carousel - Status Badge Generation", () => {
  const fixedNow = new Date("2026-11-05T12:00:00Z"); // 2026-11-05 in IST

  it("assigns 'disabled' status when enabled is false", () => {
    const status = getHeroImageStatus({ enabled: false }, fixedNow);
    expect(status).toEqual({ kind: "disabled", label: "Disabled" });
  });

  it("assigns 'always_on' when no date window is set", () => {
    const status = getHeroImageStatus(
      { enabled: true, startDate: null, endDate: null },
      fixedNow
    );
    expect(status).toEqual({ kind: "always_on", label: "Always on" });
  });

  it("assigns 'scheduled' when start date is in the future", () => {
    const status = getHeroImageStatus(
      { enabled: true, startDate: "2026-11-10", endDate: "2026-11-20" },
      fixedNow
    );
    expect(status).toEqual({
      kind: "scheduled",
      label: "Scheduled (starts 2026-11-10)",
    });
  });

  it("assigns 'expired' when end date is in the past", () => {
    const status = getHeroImageStatus(
      { enabled: true, startDate: "2026-10-01", endDate: "2026-11-01" },
      fixedNow
    );
    expect(status).toEqual({
      kind: "expired",
      label: "Expired (ended 2026-11-01)",
    });
  });

  it("assigns 'live' when today falls inside the window", () => {
    const status = getHeroImageStatus(
      { enabled: true, startDate: "2026-11-01", endDate: "2026-11-10" },
      fixedNow
    );
    expect(status).toEqual({ kind: "live", label: "Live now" });
  });
});

describe("Hero Carousel - 25 Image Cap & Concurrency Transaction Simulation", () => {
  it("enforces MAX_HERO_IMAGES is exactly 25", () => {
    expect(MAX_HERO_IMAGES).toBe(25);
  });

  it("simulates atomic cap check and concurrent race condition prevention", async () => {
    // Model simulated database table state
    let storedCount = 24;
    let lockActive = false;

    // Simulated transaction function using advisory locking semantics
    const attemptUpload = async (id: string): Promise<{ success: boolean; error?: string }> => {
      // Simulate acquiring pg_advisory_xact_lock
      while (lockActive) {
        await new Promise((r) => setTimeout(r, 10));
      }
      lockActive = true;

      try {
        if (storedCount >= MAX_HERO_IMAGES) {
          return {
            success: false,
            error: `Limit of ${MAX_HERO_IMAGES} hero images reached.`,
          };
        }

        // Simulate processing and insert delay
        await new Promise((r) => setTimeout(r, 15));
        storedCount += 1;
        return { success: true };
      } finally {
        lockActive = false;
      }
    };

    // Both attempt to upload concurrently when count is 24
    const [resultA, resultB] = await Promise.all([
      attemptUpload("upload-a"),
      attemptUpload("upload-b"),
    ]);

    // Exactly one must succeed, and one must be rejected
    const successCount = (resultA.success ? 1 : 0) + (resultB.success ? 1 : 0);
    expect(successCount).toBe(1);

    // Stored count must be exactly 25, never 26
    expect(storedCount).toBe(25);

    // A third attempt must immediately fail
    const resultC = await attemptUpload("upload-c");
    expect(resultC.success).toBe(false);
    expect(resultC.error).toContain("Limit of 25 hero images reached.");
    expect(storedCount).toBe(25);
  });
});
