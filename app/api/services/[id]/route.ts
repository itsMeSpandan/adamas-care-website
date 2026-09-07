import { NextResponse } from "next/server";
import { getServiceById, updateService, deleteService } from "@/lib/queries";
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
    const service = await getServiceById(id);
    if (!service) {
      return NextResponse.json({ error: "Service not found" }, { status: 404 });
    }
    return NextResponse.json(service);
  } catch (error) {
    console.error("Failed to fetch service:", error);
    return NextResponse.json({ error: "Failed to fetch service" }, { status: 500 });
  }
}

export const PUT = requireRole("admin", async (request: Request, context) => {
  const { id } = await context!.params!;
  try {
    const body = await request.json();
    const existing = await getServiceById(id);
    if (!existing) {
      return NextResponse.json({ error: "Service not found" }, { status: 404 });
    }

    const service = await updateService(id, body);

    const session = await getSessionFromRequest(request);
    logAudit({
      action: "service_update",
      entityType: "service",
      entityId: id,
      adminId: session?.userId,
      adminName: session?.email,
      details: `Updated service: ${existing.name}`,
      ip: getClientIp(request),
    });

    return NextResponse.json({ service });
  } catch (error) {
    console.error("Failed to update service:", error);
    return NextResponse.json({ error: "Failed to update service" }, { status: 500 });
  }
});

export const DELETE = requireRole("admin", async (request: Request, context) => {
  const { id } = await context!.params!;
  try {
    const existing = await getServiceById(id);
    if (!existing) {
      return NextResponse.json({ error: "Service not found" }, { status: 404 });
    }

    await deleteService(id);

    const session = await getSessionFromRequest(request);
    logAudit({
      action: "service_delete",
      entityType: "service",
      entityId: id,
      adminId: session?.userId,
      adminName: session?.email,
      details: `Deleted service: ${existing.name}`,
      ip: getClientIp(request),
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Failed to delete service:", error);
    return NextResponse.json({ error: "Failed to delete service" }, { status: 500 });
  }
});
