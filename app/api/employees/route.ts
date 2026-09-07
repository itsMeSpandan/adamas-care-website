import { NextResponse } from "next/server";
import { getEmployees, createEmployee, generateUniqueEmployeeEmail, createUser } from "@/lib/queries";
import { requireRole } from "@/lib/require-auth";
import { hashPassword } from "@/lib/crypto";
import { logAudit, getClientIp } from "@/lib/audit";
import { getSessionFromRequest } from "@/lib/auth";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const employees = await getEmployees();
    return NextResponse.json(employees);
  } catch (error) {
    console.error("Failed to fetch employees:", error);
    return NextResponse.json(
      { error: "Failed to fetch employees" },
      { status: 500 }
    );
  }
}

export const POST = requireRole("admin", async (request: Request) => {
  try {
    const body = await request.json();
    const { name, role, gender, bio, imageUrl, yearsExperience, instagramHandle, serviceIds } = body;

    if (!name || !role) {
      return NextResponse.json(
        { error: "Missing required fields: name, role" },
        { status: 400 }
      );
    }

    // Always auto-generate email from name (ignore any client-supplied email)
    const employeeEmail = await generateUniqueEmployeeEmail(name);

    // Default password for new employees — they must change it on first login
    const defaultPassword = "password123";
    const hashedPassword = await hashPassword(defaultPassword);

    // Generate a unique ID
    const id = `emp_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;

    const employee = await createEmployee({
      id,
      name,
      email: employeeEmail,
      role,
      gender: gender || null,
      bio: bio || "",
      imageUrl: imageUrl || `https://ui-avatars.com/api/?name=${encodeURIComponent(name)}&background=e8ddd3&color=7c6e5a&size=200`,
      yearsExperience: yearsExperience || 0,
      instagramHandle: instagramHandle || undefined,
      serviceIds: serviceIds || [],
    });

    // Create a User account so the employee can log in
    await createUser({
      name,
      email: employeeEmail,
      password: hashedPassword,
      role: "employee",
      avatarUrl: employee.imageUrl,
    });

    // Link the user account to the employee record
    const { db } = await import("@/lib/db");
    await db.user.updateMany({
      where: { email: employeeEmail },
      data: {
        employeeId: id,
        mustChangePassword: true,
      },
    });

    const session = await getSessionFromRequest(request);
    logAudit({
      action: "employee_create",
      entityType: "employee",
      entityId: id,
      adminId: session?.userId,
      adminName: session?.email,
      details: `Created employee: ${name} (${role})`,
      ip: getClientIp(request),
    });

    return NextResponse.json(
      {
        employee,
        email: employeeEmail,
        password: defaultPassword,
      },
      { status: 201 }
    );
  } catch (error) {
    console.error("Failed to create employee:", error);
    return NextResponse.json(
      { error: "Failed to create employee" },
      { status: 500 }
    );
  }
});
