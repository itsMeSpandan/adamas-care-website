import { NextResponse } from "next/server";
import { requireRole } from "@/lib/require-auth";
import { db } from "@/lib/db";

export const dynamic = "force-dynamic";

/**
 * GET /api/admin/loyalty/users
 * Returns all users with loyalty data — points, transaction count, redemption count.
 * Admin-only.
 */
export const GET = requireRole("admin", async () => {
  try {
    // Fetch all non-admin, non-employee users with their loyalty stats
    const users = await db.user.findMany({
      where: {
        role: "user",
      },
      select: {
        id: true,
        name: true,
        email: true,
        loyaltyPoints: true,
        createdAt: true,
        _count: {
          select: {
            loyaltyTransactions: true,
            redemptions: true,
            bookings: true,
          },
        },
      },
      orderBy: { loyaltyPoints: "desc" },
    });

    // Get total points across all users
    const totalPoints = users.reduce((sum, u) => sum + u.loyaltyPoints, 0);

    return NextResponse.json({
      users: users.map((u) => ({
        id: u.id,
        name: u.name,
        email: u.email,
        loyaltyPoints: u.loyaltyPoints,
        transactionCount: u._count.loyaltyTransactions,
        redemptionCount: u._count.redemptions,
        bookingCount: u._count.bookings,
        memberSince: u.createdAt,
      })),
      totalUsers: users.length,
      totalPointsOutstanding: totalPoints,
    });
  } catch (error) {
    console.error("Failed to fetch loyalty users:", error);
    return NextResponse.json(
      { error: "Failed to fetch loyalty users" },
      { status: 500 }
    );
  }
});
