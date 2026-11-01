import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { requireRole } from "@/lib/require-auth";
import { getSessionFromRequest } from "@/lib/auth";
import { logAudit, getClientIp } from "@/lib/audit";
import { revalidatePath } from "next/cache";
import { getHeroImageStatus } from "@/lib/hero-images";

export const dynamic = "force-dynamic";

/**
 * PATCH /api/admin/hero-images/[id]
 *
 * Update hero image metadata: alt text, enabled state, scheduling dates, or focal point.
 */
export const PATCH = requireRole("admin", async (request: Request, context) => {
  const session = await getSessionFromRequest(request);
  if (!session) {
    return NextResponse.json({ error: "Authentication required" }, { status: 401 });
  }

  const { id } = await context!.params!;
  if (!id) {
    return NextResponse.json({ error: "Missing image id" }, { status: 400 });
  }

  let body: Record<string, unknown>;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const existing = await db.heroImage.findUnique({ where: { id } });
  if (!existing) {
    return NextResponse.json({ error: "Hero image not found" }, { status: 404 });
  }

  const dataToUpdate: Record<string, unknown> = {};

  if (body.alt !== undefined) {
    if (typeof body.alt !== "string" || body.alt.trim().length < 3) {
      return NextResponse.json(
        { error: "Alt text must be at least 3 characters." },
        { status: 400 }
      );
    }
    dataToUpdate.alt = body.alt.trim();
  }

  if (body.enabled !== undefined) {
    dataToUpdate.enabled = Boolean(body.enabled);
  }

  const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;

  let nextStart = existing.startDate;
  let nextEnd = existing.endDate;

  if (body.startDate !== undefined) {
    if (body.startDate === null || body.startDate === "") {
      nextStart = null;
    } else if (typeof body.startDate === "string" && DATE_RE.test(body.startDate.trim())) {
      nextStart = body.startDate.trim();
    } else {
      return NextResponse.json({ error: "Start date must be in YYYY-MM-DD format" }, { status: 400 });
    }
    dataToUpdate.startDate = nextStart;
  }

  if (body.endDate !== undefined) {
    if (body.endDate === null || body.endDate === "") {
      nextEnd = null;
    } else if (typeof body.endDate === "string" && DATE_RE.test(body.endDate.trim())) {
      nextEnd = body.endDate.trim();
    } else {
      return NextResponse.json({ error: "End date must be in YYYY-MM-DD format" }, { status: 400 });
    }
    dataToUpdate.endDate = nextEnd;
  }

  if (nextStart && nextEnd && nextEnd < nextStart) {
    return NextResponse.json({ error: "End date cannot be before start date" }, { status: 400 });
  }

  if (body.focalX !== undefined) {
    const fx = Number(body.focalX);
    if (Number.isNaN(fx) || fx < 0 || fx > 100) {
      return NextResponse.json({ error: "Focal X must be between 0 and 100" }, { status: 400 });
    }
    dataToUpdate.focalX = fx;
  }

  if (body.focalY !== undefined) {
    const fy = Number(body.focalY);
    if (Number.isNaN(fy) || fy < 0 || fy > 100) {
      return NextResponse.json({ error: "Focal Y must be between 0 and 100" }, { status: 400 });
    }
    dataToUpdate.focalY = fy;
  }

  try {
    const updated = await db.heroImage.update({
      where: { id },
      data: dataToUpdate,
    });

    logAudit({
      action: "hero_image_update",
      entityType: "hero_image",
      entityId: id,
      adminId: session.userId,
      adminName: session.email,
      details: `Updated hero image "${updated.alt}" (enabled: ${updated.enabled}, dates: ${updated.startDate || "none"} to ${updated.endDate || "none"})`,
      ip: getClientIp(request),
    });

    revalidatePath("/");
    revalidatePath("/hero-images");

    const now = new Date();
    return NextResponse.json({
      image: {
        ...updated,
        desktopUrl: `/hero-images/${updated.id}/desktop?v=${updated.updatedAt.getTime()}`,
        mobileUrl: `/hero-images/${updated.id}/mobile?v=${updated.updatedAt.getTime()}`,
        status: getHeroImageStatus(updated, now),
      },
    });
  } catch (error) {
    console.error("Failed to update hero image:", error);
    return NextResponse.json({ error: "Failed to update image" }, { status: 500 });
  }
});

/**
 * DELETE /api/admin/hero-images/[id]
 *
 * Delete a hero image and its stored WebP asset (cascading).
 */
export const DELETE = requireRole("admin", async (request: Request, context) => {
  const session = await getSessionFromRequest(request);
  if (!session) {
    return NextResponse.json({ error: "Authentication required" }, { status: 401 });
  }

  const { id } = await context!.params!;
  if (!id) {
    return NextResponse.json({ error: "Missing image id" }, { status: 400 });
  }

  const existing = await db.heroImage.findUnique({ where: { id } });
  if (!existing) {
    return NextResponse.json({ error: "Hero image not found" }, { status: 404 });
  }

  try {
    await db.heroImage.delete({ where: { id } });

    logAudit({
      action: "hero_image_delete",
      entityType: "hero_image",
      entityId: id,
      adminId: session.userId,
      adminName: session.email,
      details: `Deleted hero image "${existing.alt}"`,
      ip: getClientIp(request),
    });

    revalidatePath("/");
    revalidatePath("/hero-images");

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Failed to delete hero image:", error);
    return NextResponse.json({ error: "Failed to delete image" }, { status: 500 });
  }
});
