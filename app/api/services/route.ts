import { NextResponse } from "next/server";
import { getServices, createService } from "@/lib/queries";
import { requireRole } from "@/lib/require-auth";
import { logAudit, getClientIp } from "@/lib/audit";
import { getSessionFromRequest } from "@/lib/auth";
import { isServiceAudience } from "@/lib/service-audience";
import { db } from "@/lib/db";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const includeInactive = searchParams.get("includeInactive") === "true";
    const services = await getServices({ includeInactive });
    return NextResponse.json(services);
  } catch (error) {
    console.error("Failed to fetch services:", error);
    return NextResponse.json({ error: "Failed to fetch services" }, { status: 500 });
  }
}

export const POST = requireRole("admin", async (request: Request) => {
  try {
    const body = await request.json();
    const {
      name,
      category,
      description,
      longDescription,
      durationMinutes,
      price,
      imageUrl,
      featured,
      audience,
      employeeIds,
      groupKey,
      groupName,
      variantLabel,
      groupType,
      isActive,
    } = body;

    if (!name || !category || !description || durationMinutes === undefined || price === undefined) {
      return NextResponse.json(
        { error: "Missing required fields: name, category, description, durationMinutes, price" },
        { status: 400 }
      );
    }

    // Every service is male-only, female-only or unisex
    if (audience !== undefined && !isServiceAudience(audience)) {
      return NextResponse.json(
        { error: "audience must be one of: male, female, unisex" },
        { status: 400 }
      );
    }

    // Treatment group validation
    if (groupKey) {
      const existingGroupVariants = await db.service.findMany({
        where: { groupKey },
      });

      if (existingGroupVariants.length > 0) {
        // 1. Must share category
        if (existingGroupVariants.some((s) => s.category !== category)) {
          return NextResponse.json(
            { error: `All variants in group "${groupName || groupKey}" must have category "${existingGroupVariants[0].category}"` },
            { status: 400 }
          );
        }
        // 2. If duration group, no duplicate durationMinutes
        const effectiveType = groupType || (existingGroupVariants[0] as any).groupType || "duration";
        if (effectiveType === "duration") {
          if (existingGroupVariants.some((s) => s.durationMinutes === durationMinutes)) {
            return NextResponse.json(
              { error: `A variant with duration ${durationMinutes} minutes already exists in group "${groupName || groupKey}"` },
              { status: 400 }
            );
          }
        }
      }
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
      imageUrl: imageUrl || "/images/service-illustration.jpg",
      featured: featured ?? false,
      audience: audience ?? "unisex",
      employeeIds: employeeIds || [],
      groupKey: groupKey || null,
      groupName: groupName || null,
      variantLabel: variantLabel || null,
      groupType: groupType || "duration",
      isActive: isActive !== false,
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
