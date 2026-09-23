import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { requireAuth } from "@/lib/require-auth";
import { getSessionFromRequest } from "@/lib/auth";

export const dynamic = "force-dynamic";

/**
 * GET /api/waitlist/me
 *
 * Returns the logged-in user's own waitlist entries (across all statuses)
 * plus their personal reliability summary. Never exposes other users' data.
 */
export const GET = requireAuth(async (request: Request) => {
  const session = await getSessionFromRequest(request);
  if (!session) {
    return NextResponse.json({ error: "Authentication required" }, { status: 401 });
  }

  try {
    const userId = session.userId;

    // Fetch all waitlist entries for this user with employee + service info
    const entries = await db.waitlist.findMany({
      where: { userId },
      include: {
        employee: { select: { id: true, name: true, imageUrl: true } },
      },
      orderBy: { createdAt: "desc" },
    });

    // Fetch user's own reliability data
    const reliability = await db.userReliability.findUnique({
      where: { userId },
    });

    // Build a friendly reliability summary
    let reliabilitySummary: string;
    if (!reliability) {
      reliabilitySummary = "Great track record — no issues on file!";
    } else {
      const totalIssues =
        reliability.cancelCount + reliability.lateCancelCount + reliability.noShowCount;

      if (totalIssues === 0) {
        reliabilitySummary = "Great track record — no issues on file!";
      } else if (reliability.noShowCount >= 3) {
        reliabilitySummary = `Account restricted — ${reliability.noShowCount} no-show(s) recorded. Please contact support.`;
      } else if (reliability.lateCancelCount >= 2 || reliability.noShowCount >= 2) {
        reliabilitySummary = `${reliability.lateCancelCount} late cancellation(s) and ${reliability.noShowCount} no-show(s) on record. Please try to arrive on time.`;
      } else if (reliability.cancelCount > 0 || reliability.lateCancelCount > 0) {
        reliabilitySummary = `${reliability.cancelCount} cancellation(s) and ${reliability.lateCancelCount} late cancellation(s) on record.`;
      } else {
        reliabilitySummary = "Minor issues on record — keep up the good work!";
      }
    }

    return NextResponse.json({
      entries: entries.map((e) => ({
        id: e.id,
        employee: e.employee,
        slotStart: e.slotStart,
        slotEnd: e.slotEnd,
        serviceId: e.serviceId,
        status: e.status,
        createdAt: e.createdAt,
        notifiedAt: e.notifiedAt,
        claimExpiresAt: e.claimExpiresAt,
      })),
      reliability: {
        summary: reliabilitySummary,
        cancelCount: reliability?.cancelCount ?? 0,
        lateCancelCount: reliability?.lateCancelCount ?? 0,
        noShowCount: reliability?.noShowCount ?? 0,
        restrictedUntil: reliability?.restrictedUntil ?? null,
      },
    });
  } catch (error) {
    console.error("Failed to fetch waitlist entries:", error);
    return NextResponse.json(
      { error: "Failed to fetch waitlist entries" },
      { status: 500 }
    );
  }
});
