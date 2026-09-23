import { NextRequest, NextResponse } from "next/server";
import { getEligibleEmployees } from "@/lib/scoring-engine";
import { getSessionFromRequest } from "@/lib/auth";

export const dynamic = "force-dynamic";

/**
 * GET /api/employees?serviceIds=haircut,color
 *
 * Returns employees who offer the requested services, filtered by
 * the logged-in user's gender preference:
 *   - MALE user → only male employees
 *   - FEMALE user → only female employees
 *   - null/other/unspecified → ALL eligible employees (no filter)
 *
 * Requires authentication to determine gender.
 */
export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const serviceIdsParam = searchParams.get("serviceIds");

  // No serviceIds → return ALL employees (admin dashboard, schedule, etc.)
  if (!serviceIdsParam) {
    const { db } = await import("@/lib/db");
    const employees = await db.employee.findMany({
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
        gender: true,
        bio: true,
        imageUrl: true,
        yearsExperience: true,
        instagramHandle: true,
        rating: true,
        reviewCount: true,
        employeeServices: { select: { serviceId: true } },
      },
      orderBy: { name: "asc" },
    });
    const shaped = employees.map((e) => ({
      id: e.id,
      name: e.name,
      email: e.email,
      role: e.role,
      gender: e.gender,
      bio: e.bio,
      imageUrl: e.imageUrl,
      yearsExperience: e.yearsExperience,
      instagramHandle: e.instagramHandle,
      rating: e.rating,
      reviewCount: e.reviewCount,
      serviceIds: e.employeeServices.map((s) => s.serviceId),
    }));
    return NextResponse.json(shaped);
  }

  const serviceIds = serviceIdsParam.split(",").filter(Boolean);
  if (serviceIds.length === 0) {
    return NextResponse.json([]);
  }

  try {
    // Get session to determine userId for gender filter
    const session = await getSessionFromRequest(request);

    if (!session?.userId) {
      // Unauthenticated: return all eligible employees (no gender filter)
      const { db } = await import("@/lib/db");
      const employeeServices = await db.employeeService.findMany({
        where: { serviceId: { in: serviceIds } },
        select: { employeeId: true },
      });
      const employeeIds = Array.from(
        new Set(employeeServices.map((es) => es.employeeId))
      );
      const employees = await db.employee.findMany({
        where: { id: { in: employeeIds } },
        select: { id: true, name: true, gender: true, rating: true, imageUrl: true },
      });
      return NextResponse.json({ employees });
    }

    // Authenticated: apply gender filter
    const employees = await getEligibleEmployees(session.userId, serviceIds);

    return NextResponse.json({ employees });
  } catch (error) {
    console.error("Failed to fetch eligible employees:", error);
    return NextResponse.json(
      { error: "Failed to fetch eligible employees" },
      { status: 500 }
    );
  }
}
