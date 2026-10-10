import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { requireAuth, requireRole } from "@/lib/require-auth";
import { getSessionFromRequest } from "@/lib/auth";
import { logAudit, getClientIp } from "@/lib/audit";
import { MAX_BACKGROUND_FIELD_LENGTH, validateImageField } from "@/lib/image-field";

export const dynamic = "force-dynamic";

/**
 * The member dashboard's background image, kept in the SystemSetting key/value
 * table so an admin can change it without a deploy.
 *
 * The image itself is served from ./image rather than inlined here: a
 * full-viewport background is far too big to ship in a JSON response on every
 * dashboard load, and a separate URL can be cached for a year. This endpoint
 * only answers "is a custom background set, and which version is it", so the
 * client can build a cache-busting URL.
 */
const SETTING_KEY = "dashboard_background";
const DESCRIPTION = "Background image for the signed-in member dashboard";

/** Read the stored background once so every caller agrees on the version. */
async function readBackground(): Promise<{ value: string | null; version: string | null }> {
  const setting = await db.systemSetting.findUnique({ where: { key: SETTING_KEY } });
  if (!setting?.value) return { value: null, version: null };
  // updatedAt is the cache-buster: it changes on every write, so a replaced
  // image can never be served from a stale immutable cache entry.
  return { value: setting.value, version: String(setting.updatedAt.getTime()) };
}

/**
 * GET /api/dashboard-background
 *
 * Which background to render. Any signed-in member may read it (it is their
 * dashboard's decoration); the image bytes are public, see ./image.
 */
export const GET = requireAuth(async () => {
  const { value, version } = await readBackground();
  return NextResponse.json({ custom: Boolean(value), version });
});

/**
 * PUT /api/dashboard-background
 *
 * Body: { image } — an uploaded photo (data URL), a local /path, or an https
 * address. Admin only, and validated like any other uploaded image.
 */
export const PUT = requireRole("admin", async (request: Request) => {
  const session = await getSessionFromRequest(request);
  if (!session) {
    return NextResponse.json({ error: "Authentication required" }, { status: 401 });
  }

  let body: { image?: unknown };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const image = validateImageField(body.image, {
    maxLength: MAX_BACKGROUND_FIELD_LENGTH,
  });
  if (!image.ok) {
    return NextResponse.json({ error: image.error }, { status: 400 });
  }
  if (image.kind !== "value") {
    return NextResponse.json(
      { error: "Provide an image to use as the background." },
      { status: 400 }
    );
  }

  try {
    const saved = await db.systemSetting.upsert({
      where: { key: SETTING_KEY },
      create: {
        key: SETTING_KEY,
        value: image.value,
        description: DESCRIPTION,
        updatedBy: session.userId,
      },
      update: { value: image.value, description: DESCRIPTION, updatedBy: session.userId },
    });

    logAudit({
      action: "dashboard_background_update",
      entityType: "system_setting",
      entityId: SETTING_KEY,
      adminId: session.userId,
      adminName: session.email,
      details: `Dashboard background replaced (${Math.round(image.value.length / 1024)} KB)`,
      ip: getClientIp(request),
    });

    return NextResponse.json({
      custom: true,
      version: String(saved.updatedAt.getTime()),
    });
  } catch (error) {
    console.error("Failed to save dashboard background:", error);
    return NextResponse.json({ error: "Failed to save the background" }, { status: 500 });
  }
});

/**
 * DELETE /api/dashboard-background
 *
 * Drop the custom background and fall back to the default picture. Admin only.
 */
export const DELETE = requireRole("admin", async (request: Request) => {
  const session = await getSessionFromRequest(request);
  if (!session) {
    return NextResponse.json({ error: "Authentication required" }, { status: 401 });
  }

  try {
    await db.systemSetting.deleteMany({ where: { key: SETTING_KEY } });

    logAudit({
      action: "dashboard_background_reset",
      entityType: "system_setting",
      entityId: SETTING_KEY,
      adminId: session.userId,
      adminName: session.email,
      details: "Dashboard background reset to the default image",
      ip: getClientIp(request),
    });

    return NextResponse.json({ custom: false, version: null });
  } catch (error) {
    console.error("Failed to reset dashboard background:", error);
    return NextResponse.json({ error: "Failed to reset the background" }, { status: 500 });
  }
});
