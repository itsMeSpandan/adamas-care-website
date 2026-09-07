import { NextResponse } from "next/server";
import { requireRole } from "@/lib/require-auth";
import { db } from "@/lib/db";

export const dynamic = "force-dynamic";

/**
 * GET /api/admin/reports?month=2026-09
 * Returns a CSV file with monthly revenue breakdown:
 * - Per-employee earnings
 * - Per-service bookings & revenue
 * - Overall summary
 */
export const GET = requireRole("admin", async (request: Request) => {
  try {
    const { searchParams } = new URL(request.url);
    const monthParam = searchParams.get("month"); // "2026-09" format

    let year: number;
    let month: number;

    if (monthParam) {
      const [y, m] = monthParam.split("-").map(Number);
      year = y;
      month = m - 1; // JS months are 0-indexed
    } else {
      const now = new Date();
      year = now.getFullYear();
      month = now.getMonth();
    }

    const monthStart = new Date(Date.UTC(year, month, 1));
    const monthEnd = new Date(Date.UTC(year, month + 1, 0, 23, 59, 59, 999));
    const monthLabel = monthStart.toLocaleDateString("en-US", {
      month: "long",
      year: "numeric",
    });

    // Fetch all completed bookings for the month
    const bookings = await db.booking.findMany({
      where: {
        status: "completed",
        date: { gte: monthStart, lte: monthEnd },
      },
      include: {
        service: { select: { id: true, name: true, category: true } },
        employee: { select: { id: true, name: true, gender: true } },
      },
      orderBy: { date: "asc" },
    });

    // Build CSV rows
    const rows: string[] = [];

    // Header section
    rows.push(`Monthly Revenue Report — ${monthLabel}`);
    rows.push(`Generated: ${new Date().toISOString().split("T")[0]}`);
    rows.push(`Total Bookings: ${bookings.length}`);
    rows.push(
      `Total Revenue: ₹${bookings.reduce((s, b) => s + b.price, 0).toLocaleString()}`
    );
    rows.push("");

    // ── Section 1: Per-Employee Earnings ──
    rows.push("=== PER-EMPLOYEE EARNINGS ===");
    rows.push("Employee,Gender,Bookings,Total Earnings,Avg per Booking");

    const empMap = new Map<
      string,
      { name: string; gender: string; count: number; total: number }
    >();
    for (const b of bookings) {
      if (!b.employee) continue;
      const key = b.employee.id;
      const existing = empMap.get(key);
      if (existing) {
        existing.count++;
        existing.total += b.price;
      } else {
        empMap.set(key, {
          name: b.employee.name,
          gender: b.employee.gender || "",
          count: 1,
          total: b.price,
        });
      }
    }
    const empRows = Array.from(empMap.values()).sort(
      (a, b) => b.total - a.total
    );
    for (const e of empRows) {
      const avg = e.count > 0 ? Math.round(e.total / e.count) : 0;
      rows.push(
        `"${e.name}","${e.gender}",${e.count},₹${e.total.toLocaleString()},₹${avg.toLocaleString()}`
      );
    }
    rows.push("");

    // ── Section 2: Per-Service Breakdown ──
    rows.push("=== PER-SERVICE BREAKDOWN ===");
    rows.push(
      "Service,Category,Bookings,Revenue,Avg per Booking"
    );

    const svcMap = new Map<
      string,
      { name: string; category: string; count: number; total: number }
    >();
    for (const b of bookings) {
      if (!b.service) continue;
      const key = b.service.id;
      const existing = svcMap.get(key);
      if (existing) {
        existing.count++;
        existing.total += b.price;
      } else {
        svcMap.set(key, {
          name: b.service.name,
          category: b.service.category,
          count: 1,
          total: b.price,
        });
      }
    }
    const svcRows = Array.from(svcMap.values()).sort(
      (a, b) => b.total - a.total
    );
    for (const s of svcRows) {
      const avg = s.count > 0 ? Math.round(s.total / s.count) : 0;
      rows.push(
        `"${s.name}","${s.category}",${s.count},₹${s.total.toLocaleString()},₹${avg.toLocaleString()}`
      );
    }
    rows.push("");

    // ── Section 3: Detailed Booking List ──
    rows.push("=== DETAILED BOOKING LIST ===");
    rows.push(
      "Date,Client,Service,Employee,Price,Status"
    );
    for (const b of bookings) {
      const dateStr = new Date(b.date).toLocaleDateString("en-US", {
        year: "numeric",
        month: "short",
        day: "numeric",
      });
      rows.push(
        `"${dateStr}","${b.name}","${b.service?.name || ""}","${b.employee?.name || ""}",₹${b.price.toLocaleString()},"${b.status}"`
      );
    }

    const csv = rows.join("\n");
    const filename = `revenue-report-${year}-${String(month + 1).padStart(2, "0")}.csv`;

    return new NextResponse(csv, {
      status: 200,
      headers: {
        "Content-Type": "text/csv; charset=utf-8",
        "Content-Disposition": `attachment; filename="${filename}"`,
        "Cache-Control": "no-store",
      },
    });
  } catch (error) {
    console.error("Failed to generate report:", error);
    return NextResponse.json(
      { error: "Failed to generate report" },
      { status: 500 }
    );
  }
});
