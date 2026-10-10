import { NextResponse } from "next/server";
import { requireCronAuth } from "@/lib/cron-auth";
import { expireStaleClaims } from "@/lib/waitlist";

export const dynamic = "force-dynamic";

/**
 * GET /api/cron/waitlist-expiry
 *
 * Triggered by Vercel Cron (every 10 minutes) with
 * `Authorization: Bearer CRON_SECRET`.
 *
 * Offers a freed slot to the top waitlisted user for 30 minutes. If the user
 * never claims it, the entry has to move on by itself — otherwise it stays
 * `notified` forever, which excludes it from the ranking (rankWaitlist only
 * looks at `waiting`) while still counting as "on waitlist", so the slot is
 * offered to nobody and the queue stalls. This sweep expires every overdue
 * claim and passes the slot to the next person in line.
 *
 * Idempotent: each flip is conditional on the entry still being `notified`, so
 * running twice (or racing a manual claim) cannot double-expire an entry.
 */
export async function GET(request: Request) {
  const denied = requireCronAuth(request);
  if (denied) return denied;

  try {
    const result = await expireStaleClaims();
    return NextResponse.json({
      message: "Waitlist claims swept",
      expired: result.expired,
      cascaded: result.cascaded,
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    console.error("[cron/waitlist-expiry] Sweep failed:", error);
    return NextResponse.json(
      { error: "Failed to sweep waitlist claims" },
      { status: 500 }
    );
  }
}
