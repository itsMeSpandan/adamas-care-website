import { NextResponse } from "next/server";
import { getServices, createService } from "@/lib/queries";
import { requireRole } from "@/lib/require-auth";
import { logAudit, getClientIp } from "@/lib/audit";
import { getSessionFromRequest } from "@/lib/auth";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const services = await getServices();
    return NextResponse.json(services);
  } catch (error) {
    console.error("Failed to fetch services:", error);
    return NextResponse.json({ error: "Failed to fetch services" }, { status: 500 });
  }
}

export const POST = requireRole("admin", async (request: Request) => {
  try {
    const body = await request.json();
    const { name, category, description, longDescription, durationMinutes, price, imageUrl, featured, employeeIds } = body;

    if (!name || !category || !description || durationMinutes === undefined || price === undefined) {
      return NextResponse.json(
        { error: "Missing required fields: name, category, description, durationMinutes, price" },
        { status: 400 }
      );
    }

    const id = `svc_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;

    const session = await getSessionFromRequest(request);

    const service = await createService({
      id,
      name,
      category,
      description,
      longDescription: longDescription || description,
      durationMinutes,
      price,
      imageUrl: imageUrl || "/images/photo-1560066984-138dadb4c035",
      featured: featured ?? false,
      employeeIds: employeeIds || [],
    });

    logAudit({
      action: "service_create",
      entityType: "service",
      entityId: id,
      adminId: session?.userId,
      adminName: session?.email,
      details: `Created service: ${name}`,
      ip: getClientIp(request),
    });

    return NextResponse.json({ service }, { status: 201 });
  } catch (error) {
    console.error("Failed to create service:", error);
    return NextResponse.json({ error: "Failed to create service" }, { status: 500 });
  }
});
