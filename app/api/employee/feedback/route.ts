import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getSession } from "@/lib/auth";

export const dynamic = "force-dynamic";

/**
 * GET /api/employee/feedback
 *
 * Employee portal feedback endpoint.
 * Returns only the logged-in employee's ratings, tag counts, and comments.
 * Customer identity (name, email, phone, booking price) is strictly hidden.
 */
export async function GET() {
  try {
    const session = await getSession();
    if (!session || (session.role !== "employee" && session.role !== "admin")) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
    }

    // Resolve employeeId by user's employee link or by email
    const user = await db.user.findUnique({
      where: { id: session.userId },
      select: { employeeId: true },
    });
    let employeeId = user?.employeeId;
    if (!employeeId) {
      const emp = await db.employee.findFirst({
        where: { email: session.email },
        select: { id: true },
      });
      if (emp) employeeId = emp.id;
    }

    if (!employeeId) {
      return NextResponse.json(
        { error: "No employee profile associated with this account" },
        { status: 404 }
      );
    }

    const ratings = await db.feedbackEmployeeRating.findMany({
      where: { employeeId },
      orderBy: { createdAt: "desc" },
      include: {
        feedback: {
          select: {
            createdAt: true,
            booking: {
              select: {
                service: { select: { name: true } },
                bookingServices: { select: { service: { select: { name: true } } } },
              },
            },
          },
        },
      },
    });

    const total = ratings.length;
    const sum = ratings.reduce((acc, r) => acc + r.rating, 0);
    const average = total > 0 ? Math.round((sum / total) * 10) / 10 : 0;

    const distribution: Record<number, number> = { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 };
    const tagCounts: Record<string, number> = {};

    for (const r of ratings) {
      if (r.rating >= 1 && r.rating <= 5) {
        distribution[r.rating]++;
      }
      for (const t of r.tags) {
        tagCounts[t] = (tagCounts[t] || 0) + 1;
      }
    }

    // Anonymized reviews list (customer details stripped)
    const reviews = ratings.map((r) => {
      const b = r.feedback.booking;
      const srvList = b.bookingServices.length > 0
        ? b.bookingServices.map((bs) => bs.service.name).join(", ")
        : b.service?.name || "Service";

      return {
        id: r.id,
        rating: r.rating,
        tags: r.tags,
        comment: r.comment,
        date: r.createdAt.toISOString().split("T")[0],
        serviceName: srvList,
      };
    });

    return NextResponse.json({
      totalReviews: total,
      averageRating: average,
      distribution,
      topTags: Object.entries(tagCounts)
        .sort((a, b) => b[1] - a[1])
        .slice(0, 5)
        .map(([tag, count]) => ({ tag, count })),
      reviews,
    });
  } catch (error) {
    console.error("[Employee Feedback API Error]:", error);
    return NextResponse.json({ error: "Failed to fetch employee feedback" }, { status: 500 });
  }
}
