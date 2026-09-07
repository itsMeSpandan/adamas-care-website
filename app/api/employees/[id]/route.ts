import { NextResponse } from "next/server";
import { getEmployeeById, updateEmployee, deleteEmployee } from "@/lib/queries";
import { requireRole } from "@/lib/require-auth";
import { logAudit, getClientIp } from "@/lib/audit";
import { getSessionFromRequest } from "@/lib/auth";

export const dynamic = "force-dynamic";

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  try {
    const employee = await getEmployeeById(id);
    if (!employee) {
      return NextResponse.json(
        { error: "Employee not found" },
        { status: 404 }
      );
    }
    return NextResponse.json(employee);
  } catch (error) {
    console.error("Failed to fetch employee:", error);
    return NextResponse.json(
      { error: "Failed to fetch employee" },
      { status: 500 }
    );
  }
}

export const PUT = requireRole("admin", async (request: Request, context) => {
  const { id } = await context!.params!;
  try {
    const body = await request.json();
    const existing = await getEmployeeById(id);
    if (!existing) {
      return NextResponse.json(
        { error: "Employee not found" },
        { status: 404 }
      );
    }

    const employee = await updateEmployee(id, body);

    const session = await getSessionFromRequest(request);
    logAudit({
      action: "employee_update",
      entityType: "employee",
      entityId: id,
      adminId: session?.userId,
      adminName: session?.email,
      details: `Updated employee: ${existing.name}`,
      ip: getClientIp(request),
    });

    return NextResponse.json({ employee });
  } catch (error) {
    console.error("Failed to update employee:", error);
    return NextResponse.json(
      { error: "Failed to update employee" },
      { status: 500 }
    );
  }
});

export const DELETE = requireRole("admin", async (request: Request, context) => {
  const { id } = await context!.params!;
  try {
    const existing = await getEmployeeById(id);
    if (!existing) {
      return NextResponse.json(
        { error: "Employee not found" },
        { status: 404 }
      );
    }

    await deleteEmployee(id);

    const session = await getSessionFromRequest(request);
    logAudit({
      action: "employee_delete",
      entityType: "employee",
      entityId: id,
      adminId: session?.userId,
      adminName: session?.email,
      details: `Deleted employee: ${existing.name}`,
      ip: getClientIp(request),
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Failed to delete employee:", error);
    return NextResponse.json(
      { error: "Failed to delete employee" },
      { status: 500 }
    );
  }
});
