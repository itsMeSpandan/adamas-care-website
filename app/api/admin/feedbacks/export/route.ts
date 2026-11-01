import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getSession } from "@/lib/auth";
import { escapeCsvCell } from "@/lib/feedback";
import type { FeedbackStatus, FeedbackSource, Prisma } from "@prisma/client";

export const dynamic = "force-dynamic";

/**
 * GET /api/admin/feedbacks/export
 *
 * CSV export of filtered feedback records with spreadsheet formula injection protection.
 */
export async function GET(request: Request) {
  try {
    const session = await getSession();
    if (!session || session.role !== "admin") {
      return NextResponse.json({ error: "Unauthorized. Admin role required." }, { status: 403 });
    }

    const { searchParams } = new URL(request.url);
    const status = searchParams.get("status");
    const isFlagged = searchParams.get("isFlagged");
    const source = searchParams.get("source");
    const minRating = searchParams.get("minRating");
    const maxRating = searchParams.get("maxRating");
    const startDate = searchParams.get("startDate");
    const endDate = searchParams.get("endDate");

    const where: Prisma.FeedbackWhereInput = {};

    if (status && ["NEW", "REVIEWED", "FOLLOW_UP", "RESOLVED"].includes(status)) {
      where.status = status as FeedbackStatus;
    }
    if (isFlagged === "true") where.isFlagged = true;
    if (isFlagged === "false") where.isFlagged = false;
    if (source && ["app", "legacy"].includes(source)) where.source = source as FeedbackSource;

    if (minRating || maxRating) {
      where.overallRating = {};
      if (minRating) where.overallRating.gte = parseInt(minRating, 10);
      if (maxRating) where.overallRating.lte = parseInt(maxRating, 10);
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

    const feedbacks = await db.feedback.findMany({
      where,
      orderBy: { createdAt: "desc" },
      take: 1000,
      include: {
        user: { select: { name: true, email: true } },
        booking: { select: { name: true, email: true, date: true } },
        employeeRatings: {
          include: { employee: { select: { name: true } } },
        },
        serviceRatings: {
          include: { service: { select: { name: true } } },
        },
      },
    });

    const headers = [
      "Feedback ID",
      "Created At",
      "Source",
      "Status",
      "Flagged",
      "Customer Name",
      "Customer Email",
      "Overall Rating",
      "NPS Score",
      "Overall Tags",
      "Overall Comment",
      "Employee Ratings",
      "Service Ratings",
      "Admin Notes",
    ];

    const rows = feedbacks.map((fb) => {
      const customerName = fb.user?.name || fb.booking.name || "Customer";
      const customerEmail = fb.user?.email || fb.booking.email || "";

      const employeeSummary = fb.employeeRatings
        .map((er) => `${er.employee.name} (${er.rating}★${er.tags.length ? ` - ${er.tags.join("/")}` : ""})`)
        .join("; ");

      const serviceSummary = fb.serviceRatings
        .map((sr) => `${sr.service.name} (${sr.rating}★${sr.tags.length ? ` - ${sr.tags.join("/")}` : ""})`)
        .join("; ");

      return [
        escapeCsvCell(fb.id),
        escapeCsvCell(fb.createdAt.toISOString().split("T")[0]),
        escapeCsvCell(fb.source),
        escapeCsvCell(fb.status),
        escapeCsvCell(fb.isFlagged ? "YES" : "NO"),
        escapeCsvCell(customerName),
        escapeCsvCell(customerEmail),
        escapeCsvCell(fb.overallRating),
        escapeCsvCell(fb.npsScore ?? ""),
        escapeCsvCell(fb.overallTags.join(", ")),
        escapeCsvCell(fb.overallComment || ""),
        escapeCsvCell(employeeSummary),
        escapeCsvCell(serviceSummary),
        escapeCsvCell(fb.adminNotes || ""),
      ].join(",");
    });

    const csvContent = [headers.join(","), ...rows].join("\n");
    const dateStr = new Date().toISOString().split("T")[0];

    return new Response(csvContent, {
      status: 200,
      headers: {
        "Content-Type": "text/csv; charset=utf-8",
        "Content-Disposition": `attachment; filename="feedbacks-export-${dateStr}.csv"`,
        "Cache-Control": "no-store, private",
      },
    });
  } catch (error) {
    console.error("[Admin Feedback Export Error]:", error);
    return NextResponse.json({ error: "Failed to export feedbacks" }, { status: 500 });
  }
}
