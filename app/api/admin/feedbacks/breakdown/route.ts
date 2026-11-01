import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getSession } from "@/lib/auth";
import { EMPLOYEE_MIN_SAMPLE_SIZE, SERVICE_MIN_SAMPLE_SIZE } from "@/lib/feedback";

export const dynamic = "force-dynamic";

/**
 * GET /api/admin/feedbacks/breakdown
 *
 * Detailed ratings breakdown per employee and per service.
 * Enforces minimum sample size threshold (5 ratings) before showing ranking badges.
 * Excludes legacy data (which have no employee/service ratings).
 */
export async function GET() {
  try {
    const session = await getSession();
    if (!session || session.role !== "admin") {
      return NextResponse.json({ error: "Unauthorized. Admin role required." }, { status: 403 });
    }

    const [allEmployees, employeeRatings, allServices, serviceRatings] = await Promise.all([
      db.employee.findMany({
        select: { id: true, name: true, role: true, imageUrl: true },
      }),
      db.feedbackEmployeeRating.findMany({
        select: {
          employeeId: true,
          rating: true,
          tags: true,
        },
      }),
      db.service.findMany({
        select: { id: true, name: true, category: true },
      }),
      db.feedbackServiceRating.findMany({
        select: {
          serviceId: true,
          rating: true,
          tags: true,
        },
      }),
    ]);

    // Group employee ratings
    const employeeMap = new Map<
      string,
      { count: number; sum: number; tags: Record<string, number> }
    >();

    for (const r of employeeRatings) {
      const entry = employeeMap.get(r.employeeId) || { count: 0, sum: 0, tags: {} };
      entry.count++;
      entry.sum += r.rating;
      for (const tag of r.tags) {
        entry.tags[tag] = (entry.tags[tag] || 0) + 1;
      }
      employeeMap.set(r.employeeId, entry);
    }

    const employeeBreakdown = allEmployees
      .map((emp) => {
        const stats = employeeMap.get(emp.id) || { count: 0, sum: 0, tags: {} };
        const average = stats.count > 0 ? Math.round((stats.sum / stats.count) * 10) / 10 : null;
        return {
          id: emp.id,
          name: emp.name,
          role: emp.role,
          imageUrl: emp.imageUrl,
          responseCount: stats.count,
          averageRating: average,
          hasMinimumSample: stats.count >= EMPLOYEE_MIN_SAMPLE_SIZE,
          topTags: Object.entries(stats.tags)
            .sort((a, b) => b[1] - a[1])
            .slice(0, 3)
            .map(([tag, count]) => ({ tag, count })),
        };
      })
      .sort((a, b) => {
        // Sort ranked first, then by average descending, then count
        if (a.hasMinimumSample && !b.hasMinimumSample) return -1;
        if (!a.hasMinimumSample && b.hasMinimumSample) return 1;
        return (b.averageRating || 0) - (a.averageRating || 0);
      });

    // Group service ratings
    const serviceMap = new Map<
      string,
      { count: number; sum: number; tags: Record<string, number> }
    >();

    for (const r of serviceRatings) {
      const entry = serviceMap.get(r.serviceId) || { count: 0, sum: 0, tags: {} };
      entry.count++;
      entry.sum += r.rating;
      for (const tag of r.tags) {
        entry.tags[tag] = (entry.tags[tag] || 0) + 1;
      }
      serviceMap.set(r.serviceId, entry);
    }

    const serviceBreakdown = allServices
      .map((srv) => {
        const stats = serviceMap.get(srv.id) || { count: 0, sum: 0, tags: {} };
        const average = stats.count > 0 ? Math.round((stats.sum / stats.count) * 10) / 10 : null;
        return {
          id: srv.id,
          name: srv.name,
          category: srv.category,
          responseCount: stats.count,
          averageRating: average,
          hasMinimumSample: stats.count >= SERVICE_MIN_SAMPLE_SIZE,
          topTags: Object.entries(stats.tags)
            .sort((a, b) => b[1] - a[1])
            .slice(0, 3)
            .map(([tag, count]) => ({ tag, count })),
        };
      })
      .sort((a, b) => {
        if (a.hasMinimumSample && !b.hasMinimumSample) return -1;
        if (!a.hasMinimumSample && b.hasMinimumSample) return 1;
        return (b.averageRating || 0) - (a.averageRating || 0);
      });

    return NextResponse.json({
      employees: employeeBreakdown,
      services: serviceBreakdown,
      minimumSampleThreshold: EMPLOYEE_MIN_SAMPLE_SIZE,
    });
  } catch (error) {
    console.error("[Admin Feedback Breakdown Error]:", error);
    return NextResponse.json({ error: "Failed to fetch feedback breakdown" }, { status: 500 });
  }
}
