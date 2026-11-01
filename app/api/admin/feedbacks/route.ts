import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getSession } from "@/lib/auth";
import type { FeedbackStatus, FeedbackSource, Prisma } from "@prisma/client";

export const dynamic = "force-dynamic";

/**
 * GET /api/admin/feedbacks
 *
 * Admin paginated list of all customer feedbacks with multi-level details and filters.
 */
export async function GET(request: Request) {
  try {
    const session = await getSession();
    if (!session || session.role !== "admin") {
      return NextResponse.json({ error: "Unauthorized. Admin role required." }, { status: 403 });
    }

    const { searchParams } = new URL(request.url);
    const page = Math.max(1, parseInt(searchParams.get("page") || "1", 10));
    const limit = Math.min(100, Math.max(1, parseInt(searchParams.get("limit") || "20", 10)));
    const skip = (page - 1) * limit;

    const status = searchParams.get("status");
    const isFlagged = searchParams.get("isFlagged");
    const employeeId = searchParams.get("employeeId");
    const serviceId = searchParams.get("serviceId");
    const minRating = searchParams.get("minRating");
    const maxRating = searchParams.get("maxRating");
    const hasComment = searchParams.get("hasComment");
    const source = searchParams.get("source");
    const startDate = searchParams.get("startDate");
    const endDate = searchParams.get("endDate");

    const where: Prisma.FeedbackWhereInput = {};

    if (status && ["NEW", "REVIEWED", "FOLLOW_UP", "RESOLVED"].includes(status)) {
      where.status = status as FeedbackStatus;
    }

    if (isFlagged === "true") where.isFlagged = true;
    if (isFlagged === "false") where.isFlagged = false;

    if (source && ["app", "legacy"].includes(source)) {
      where.source = source as FeedbackSource;
    }

    if (minRating || maxRating) {
      where.overallRating = {};
      if (minRating) where.overallRating.gte = parseInt(minRating, 10);
      if (maxRating) where.overallRating.lte = parseInt(maxRating, 10);
    }

    if (hasComment === "true") {
      where.overallComment = { not: null };
    }

    if (startDate || endDate) {
      where.createdAt = {};
      if (startDate) where.createdAt.gte = new Date(startDate);
      if (endDate) {
        const end = new Date(endDate);
        end.setHours(23, 59, 59, 999);
        where.createdAt.lte = end;
      }
    }

    if (employeeId) {
      where.employeeRatings = {
        some: { employeeId },
      };
    }

    if (serviceId) {
      where.serviceRatings = {
        some: { serviceId },
      };
    }

    const [total, feedbacks] = await Promise.all([
      db.feedback.count({ where }),
      db.feedback.findMany({
        where,
        skip,
        take: limit,
        orderBy: [{ isFlagged: "desc" }, { createdAt: "desc" }],
        include: {
          user: {
            select: { id: true, name: true, email: true, avatarUrl: true },
          },
          booking: {
            select: {
              id: true,
              date: true,
              slotStart: true,
              timeSlot: true,
              price: true,
              name: true,
              email: true,
              employee: { select: { id: true, name: true } },
            },
          },
          employeeRatings: {
            include: {
              employee: { select: { id: true, name: true, role: true, imageUrl: true } },
            },
          },
          serviceRatings: {
            include: {
              service: { select: { id: true, name: true, category: true } },
            },
          },
        },
      }),
    ]);

    return NextResponse.json({
      feedbacks,
      pagination: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
      },
    });
  } catch (error) {
    console.error("[Admin Feedbacks List Error]:", error);
    return NextResponse.json({ error: "Failed to fetch feedbacks" }, { status: 500 });
  }
}
