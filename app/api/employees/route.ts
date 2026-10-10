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

export async function POST(request: NextRequest) {
  try {
    const session = await getSessionFromRequest(request);
    if (!session || session.role !== "admin") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
    }

    const { db } = await import("@/lib/db");
    const { hashPassword } = await import("@/lib/crypto");
    const { BRAND } = await import("@/lib/brand");
    const crypto = await import("crypto");

    const body = await request.json();
    const { name, role, gender, bio, imageUrl, yearsExperience, instagramHandle, serviceIds } = body;

    if (!name || !role) {
      return NextResponse.json({ error: "Name and role are required" }, { status: 400 });
    }

    // Generate base email
    const cleanName = name.toLowerCase().replace(/[^a-z0-9\s]/g, "").replace(/\s+/g, ".");
    let email = `${cleanName}@${BRAND.domain || "gracesalon.com"}`;
    
    // Ensure email uniqueness
    let emailExists = await db.user.findUnique({ where: { email } });
    let counter = 1;
    while (emailExists) {
      email = `${cleanName}${counter}@${BRAND.domain || "gracesalon.com"}`;
      emailExists = await db.user.findUnique({ where: { email } });
      counter++;
    }

    // Generate a secure random password (8 chars)
    const password = crypto.randomBytes(4).toString("hex");
    const hashedPassword = await hashPassword(password);

    // 1. Create User
    const user = await db.user.create({
      data: {
        name,
        email,
        password: hashedPassword,
        role: "employee",
        gender: gender || null,
        avatarUrl: imageUrl || `https://ui-avatars.com/api/?name=${encodeURIComponent(name)}`,
        mustChangePassword: true,
        emailVerified: true,
      }
    });

    // 2. Create Employee
    const employee = await db.employee.create({
      data: {
        id: user.id, // Linking employee id to user id
        name,
        email,
        role,
        gender: gender || null,
        bio: bio || "",
        imageUrl: imageUrl || `https://ui-avatars.com/api/?name=${encodeURIComponent(name)}`,
        yearsExperience: Number(yearsExperience) || 0,
        instagramHandle: instagramHandle || null,
        employeeServices: serviceIds && serviceIds.length > 0 ? {
          create: serviceIds.map((sid: string) => ({
            serviceId: sid
          }))
        } : undefined
      }
    });

    // 3. Update User to point to employee
    await db.user.update({
      where: { id: user.id },
      data: { employeeId: employee.id }
    });

    return NextResponse.json({
      ...employee,
      email,
      password,
    });
  } catch (error) {
    console.error("Employee creation failed:", error);
    const message = error instanceof Error ? error.message : "Failed to create employee";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
