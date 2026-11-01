import { NextResponse } from "next/server";
import { getServiceById, updateService, deleteService } from "@/lib/queries";
import { requireRole } from "@/lib/require-auth";
import { logAudit, getClientIp } from "@/lib/audit";
import { getSessionFromRequest } from "@/lib/auth";
import { isServiceAudience } from "@/lib/service-audience";
import { LEGACY_SERVICE_ID_MAP } from "@/lib/service-legacy-map";
import { db } from "@/lib/db";

export const dynamic = "force-dynamic";

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  try {
    const resolvedId = LEGACY_SERVICE_ID_MAP[id] || id;
    let service = await getServiceById(resolvedId);
    if (!service && resolvedId !== id) {
      service = await getServiceById(id);
    }
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

    if (body.audience !== undefined && !isServiceAudience(body.audience)) {
      return NextResponse.json(
        { error: "audience must be one of: male, female, unisex" },
        { status: 400 }
      );
    }

    // Treatment group validation
    const targetGroupKey = body.groupKey !== undefined ? body.groupKey : existing.groupKey;
    const targetCategory = body.category !== undefined ? body.category : existing.category;
    const targetDuration = body.durationMinutes !== undefined ? body.durationMinutes : existing.durationMinutes;
    const targetGroupType = body.groupType !== undefined ? body.groupType : existing.groupType || "duration";

    if (targetGroupKey) {
      const existingGroupVariants = await db.service.findMany({
        where: {
          groupKey: targetGroupKey,
          id: { not: id },
        },
      });

      if (existingGroupVariants.length > 0) {
        // 1. Must share category
        if (existingGroupVariants.some((s) => s.category !== targetCategory)) {
          return NextResponse.json(
            { error: `All variants in group "${body.groupName || targetGroupKey}" must have category "${existingGroupVariants[0].category}"` },
            { status: 400 }
          );
        }
        // 2. If duration group, no duplicate durationMinutes
        if (targetGroupType === "duration") {
          if (existingGroupVariants.some((s) => s.durationMinutes === targetDuration)) {
            return NextResponse.json(
              { error: `A variant with duration ${targetDuration} minutes already exists in group "${body.groupName || targetGroupKey}"` },
              { status: 400 }
            );
          }
        }
      }
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
