import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getSession } from "@/lib/auth";
import { calculateNps, NPS_MIN_SAMPLE_SIZE } from "@/lib/feedback";

export const dynamic = "force-dynamic";

/**
 * GET /api/admin/feedbacks/summary
 *
 * Provides high-level KPIs and aggregates for the admin Feedbacks tab.
 * Uses database-level aggregations and group-bys for maximum performance.
 */
export async function GET() {
  try {
    const session = await getSession();
    if (!session || session.role !== "admin") {
      return NextResponse.json({ error: "Unauthorized. Admin role required." }, { status: 403 });
    }

    // Run parallel database queries
    const [
      overallAgg,
      ratingGroups,
      statusGroups,
      flaggedCount,
      employeeAgg,
      serviceAgg,
      npsRecords,
      totalCompletedAccountBookings,
      totalAccountFeedbacks,
    ] = await Promise.all([
      // Overall rating average & total count
      db.feedback.aggregate({
        _avg: { overallRating: true },
        _count: { id: true },
      }),

      // 1 to 5 star rating distribution
      db.feedback.groupBy({
        by: ["overallRating"],
        _count: { id: true },
      }),

      // Status breakdown
      db.feedback.groupBy({
        by: ["status"],
        _count: { id: true },
      }),

      // Total flagged feedbacks
      db.feedback.count({
        where: { isFlagged: true },
      }),

      // Average employee rating (excludes legacy rows since legacy has no child rows)
      db.feedbackEmployeeRating.aggregate({
        _avg: { rating: true },
        _count: { id: true },
      }),

      // Average service rating (excludes legacy rows)
      db.feedbackServiceRating.aggregate({
        _avg: { rating: true },
        _count: { id: true },
      }),

      // NPS scores (from feedbacks where npsScore is provided)
      db.feedback.findMany({
        where: { npsScore: { not: null } },
        select: { npsScore: true },
      }),

      // Denominator for response rate: Completed bookings belonging to registered accounts (userId != null)
      db.booking.count({
        where: { status: "completed", userId: { not: null } },
      }),

      // Numerator for response rate: Feedbacks submitted by account holders
      db.feedback.count({
        where: { userId: { not: null }, source: "app" },
      }),
    ]);

    // Format distribution: ensure all 1..5 stars are represented
    const distribution: Record<number, number> = { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 };
    for (const group of ratingGroups) {
      if (group.overallRating >= 1 && group.overallRating <= 5) {
        distribution[group.overallRating] = group._count.id;
      }
    }

    // Format status breakdown
    const statusCounts: Record<string, number> = { NEW: 0, REVIEWED: 0, FOLLOW_UP: 0, RESOLVED: 0 };
    for (const g of statusGroups) {
      statusCounts[g.status] = g._count.id;
    }

    // Calculate NPS
    const npsScores = npsRecords.map((r) => r.npsScore);
    const npsResult = calculateNps(npsScores);

    // Calculate response rate (excluding guests)
    const responseRate =
      totalCompletedAccountBookings > 0
        ? Math.round((totalAccountFeedbacks / totalCompletedAccountBookings) * 1000) / 10
        : 0;

    return NextResponse.json({
      totalResponses: overallAgg._count.id,
      overallAverage: overallAgg._avg.overallRating
        ? Math.round(overallAgg._avg.overallRating * 10) / 10
        : 0,
      employeeAverage: employeeAgg._avg.rating
        ? Math.round(employeeAgg._avg.rating * 10) / 10
        : null,
      serviceAverage: serviceAgg._avg.rating
        ? Math.round(serviceAgg._avg.rating * 10) / 10
        : null,
      nps: {
        score: npsResult.score,
        promoters: npsResult.promoters,
        passives: npsResult.passives,
        detractors: npsResult.detractors,
        total: npsResult.total,
        hasMinimumSample: npsResult.hasMinimumSample,
        minimumRequired: NPS_MIN_SAMPLE_SIZE,
      },
      responseRate: {
        percentage: responseRate,
        submitted: totalAccountFeedbacks,
        eligibleCompletedBookings: totalCompletedAccountBookings,
      },
      ratingDistribution: distribution,
      statusCounts,
      flaggedCount,
    });
  } catch (error) {
    console.error("[Admin Feedback Summary Error]:", error);
    return NextResponse.json({ error: "Failed to calculate feedback summary" }, { status: 500 });
  }
}
