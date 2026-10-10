import { NextResponse } from "next/server";
import { getEmployeeById, updateEmployee, deleteEmployee } from "@/lib/queries";
import { requireRole } from "@/lib/require-auth";
import { logAudit, getClientIp } from "@/lib/audit";
import { getSessionFromRequest } from "@/lib/auth";
import { generatedAvatarUrl, validateImageField } from "@/lib/image-field";

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

    // An uploaded photo arrives as a data URL, so it is user input like any
    // other: check the scheme, the size and the actual bytes before storing it.
    // An empty value means "no photo", which falls back to an initials avatar
    // rather than an empty src that every <Image> on the site would choke on.
    const photo = validateImageField((body as { imageUrl?: unknown }).imageUrl);
    if (!photo.ok) {
      return NextResponse.json({ error: photo.error }, { status: 400 });
    }
    if (photo.kind === "clear") {
      const name = typeof body.name === "string" && body.name.trim() ? body.name : existing.name;
      body.imageUrl = generatedAvatarUrl(name);
    } else if (photo.kind === "value") {
      body.imageUrl = photo.value;
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
