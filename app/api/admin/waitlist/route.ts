import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { requireRole } from "@/lib/require-auth";
import { getSessionFromRequest } from "@/lib/auth";
import { scoreCandidate } from "@/lib/scoring";

export const dynamic = "force-dynamic";

/**
 * GET /api/admin/waitlist?employeeId=xxx
 *
 * Returns ALL waitlist entries for an employee (across all slots),
 * with reliability scores and ranking. Admin/employee only.
 */
export const GET = requireRole("admin", async (request: Request) => {
  const session = await getSessionFromRequest(request);
  if (!session) {
    return NextResponse.json(
      { error: "Authentication required" },
      { status: 401 }
    );
  }

  const url = new URL(request.url);
  const searchParams = url.searchParams;
  const employeeId = searchParams.get("employeeId");

  if (!employeeId) {
    return NextResponse.json(
      { error: "employeeId is required" },
      { status: 400 }
    );
  }

  try {
    // Get all waitlist entries for this employee
    const entries = await db.waitlist.findMany({
      where: { employeeId },
      include: {
        employee: { select: { id: true, name: true } },
      },
      orderBy: { createdAt: "desc" },
    });

    if (entries.length === 0) {
      return NextResponse.json({ entries: [], ranked: [], reliabilityMap: {} });
    }

    // Get reliability data for all involved users
    const userIds = Array.from(new Set(entries.map((e) => e.userId)));
    const reliabilities = await db.userReliability.findMany({
      where: { userId: { in: userIds } },
    });

    const reliabilityMap: Record<
      string,
      {
        cancelCount: number;
        lateCancelCount: number;
        noShowCount: number;
        restrictedUntil: Date | null;
      }
    > = {};
    for (const r of reliabilities) {
      reliabilityMap[r.userId] = {
        cancelCount: r.cancelCount,
        lateCancelCount: r.lateCancelCount,
        noShowCount: r.noShowCount,
        restrictedUntil: r.restrictedUntil,
      };
    }

    // Score each entry grouped by slotStart
    const slotGroups = new Map<string, typeof entries>();
    for (const e of entries) {
      const key = e.slotStart;
      if (!slotGroups.has(key)) slotGroups.set(key, []);
      slotGroups.get(key)!.push(e);
    }

    const ranked: Array<{
      waitlistId: string;
      userId: string;
      slotStart: string;
      score: number;
    }> = [];

    const now = new Date();

    for (const [slotStart, slotEntries] of Array.from(slotGroups.entries())) {
      if (slotEntries.length === 0) continue;

      // Compute wait durations
      const waitDurations = slotEntries.map(
        (entry: typeof entries[0]) => now.getTime() - entry.createdAt.getTime()
      );
      const maxWait = Math.max(...waitDurations, 1);

      // Compute reliability penalties
      const penalties = slotEntries.map((entry: typeof entries[0]) => {
        const r = reliabilityMap[entry.userId];
        if (!r) return 0;
        return r.noShowCount * 3 + r.lateCancelCount * 2 + r.cancelCount;
      });
      const maxPenalty = Math.max(...penalties, 1);

      // Score each
      for (let i = 0; i < slotEntries.length; i++) {
        const closenessScore = waitDurations[i] / maxWait;
        const reliabilityScore =
          maxPenalty > 0 ? 1 - penalties[i] / (maxPenalty + 1) : 1;

        const score = scoreCandidate(
          {
            closenessScore,
            reliabilityScore,
            loadScore: 0,
          },
          { closeness: 0.35, reliability: 0.65, loadPenalty: 0 }
        );

        ranked.push({
          waitlistId: slotEntries[i].id,
          userId: slotEntries[i].userId,
          slotStart,
          score,
        });
      }
    }

    // Sort ranked by score descending
    ranked.sort((a, b) => b.score - a.score);

    return NextResponse.json({
      entries: entries.map((e) => ({
        id: e.id,
        userId: e.userId,
        employeeId: e.employeeId,
        employeeName: e.employee?.name ?? "Unknown",
        slotStart: e.slotStart,
        slotEnd: e.slotEnd,
        status: e.status,
        createdAt: e.createdAt.toISOString(),
        notifiedAt: e.notifiedAt?.toISOString() ?? null,
        claimExpiresAt: e.claimExpiresAt?.toISOString() ?? null,
        serviceId: e.serviceId,
      })),
      ranked,
      reliabilityMap,
    });
  } catch (error) {
    console.error("Failed to fetch admin waitlist:", error);
    return NextResponse.json(
      { error: "Failed to fetch waitlist data" },
      { status: 500 }
    );
  }
});
