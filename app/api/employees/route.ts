import { NextResponse } from "next/server";
import { getEmployees, createEmployee, generateUniqueEmployeeEmail } from "@/lib/queries";

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

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { name, email, role, bio, imageUrl, yearsExperience, instagramHandle, serviceIds } = body;

    if (!name || !role) {
      return NextResponse.json(
        { error: "Missing required fields: name, role" },
        { status: 400 }
      );
    }

    // Use email from request body, or auto-generate from name
    const employeeEmail = email || await generateUniqueEmployeeEmail(name);

    // Generate a unique ID
    const id = `emp_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;

    const employee = await createEmployee({
      id,
      name,
      email: employeeEmail,
      role,
      bio: bio || "",
      imageUrl: imageUrl || `https://ui-avatars.com/api/?name=${encodeURIComponent(name)}&background=e8ddd3&color=7c6e5a&size=200`,
      yearsExperience: yearsExperience || 0,
      instagramHandle: instagramHandle || undefined,
      serviceIds: serviceIds || [],
    });

    return NextResponse.json(
      { employee, email: employeeEmail },
      { status: 201 }
    );
  } catch (error) {
    console.error("Failed to create employee:", error);
    return NextResponse.json(
      { error: "Failed to create employee" },
      { status: 500 }
    );
  }
}
