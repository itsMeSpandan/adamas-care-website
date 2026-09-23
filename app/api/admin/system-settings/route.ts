import { NextResponse } from "next/server";
import { requireRole } from "@/lib/require-auth";
import { getSessionFromRequest } from "@/lib/auth";
import { db } from "@/lib/db";

export const dynamic = "force-dynamic";

/**
 * GET /api/admin/system-settings
 *
 * Returns all system settings.
 */
export const GET = requireRole("admin", async () => {
  try {
    const settings = await db.systemSetting.findMany({
      orderBy: { key: "asc" },
    });

    // Convert array to object for easier consumption
    const settingsMap: Record<string, { value: string; description: string | null; updatedAt: Date; updatedBy: string | null }> = {};
    for (const s of settings) {
      settingsMap[s.key] = {
        value: s.value,
        description: s.description,
        updatedAt: s.updatedAt,
        updatedBy: s.updatedBy,
      };
    }

    return NextResponse.json({ settings: settingsMap });
  } catch (error) {
    console.error("Failed to fetch system settings:", error);
    return NextResponse.json({ error: "Failed to fetch settings" }, { status: 500 });
  }
});

/**
 * PUT /api/admin/system-settings
 *
 * Update a system setting. Body: { key, value, description? }
 */
export const PUT = requireRole("admin", async (request: Request) => {
  const session = await getSessionFromRequest(request);
  if (!session) {
    return NextResponse.json({ error: "Authentication required" }, { status: 401 });
  }

  try {
    const body = await request.json();
    const { key, value, description } = body;

    if (!key || value === undefined) {
      return NextResponse.json({ error: "key and value are required" }, { status: 400 });
    }

    // Validate key name (alphanumeric + underscores only)
    if (!/^[a-z][a-z0-9_]{0,63}$/.test(key)) {
      return NextResponse.json(
        { error: "Invalid key format. Use lowercase letters, numbers, and underscores only." },
        { status: 400 }
      );
    }

    const setting = await db.systemSetting.upsert({
      where: { key },
      create: {
        key,
        value: String(value).slice(0, 500),
        description: description || null,
        updatedBy: session.userId,
      },
      update: {
        value: String(value).slice(0, 500),
        description: description || undefined,
        updatedBy: session.userId,
      },
    });

    // Log the change
    try {
      await db.auditLog.create({
        data: {
          action: "system_setting_update",
          entityType: "system_setting",
          entityId: key,
          adminId: session.userId,
          adminName: session.email,
          details: `Setting "${key}" updated to "${String(value).slice(0, 100)}"`,
        },
      });
    } catch {
      // AuditLog table might not exist
    }

    return NextResponse.json({ setting });
  } catch (error) {
    console.error("Failed to update system setting:", error);
    return NextResponse.json({ error: "Failed to update setting" }, { status: 500 });
  }
});

/**
 * DELETE /api/admin/system-settings?key=xxx
 *
 * Delete a system setting.
 */
export const DELETE = requireRole("admin", async (request: Request) => {
  const session = await getSessionFromRequest(request);
  if (!session) {
    return NextResponse.json({ error: "Authentication required" }, { status: 401 });
  }

  try {
    const { searchParams } = new URL(request.url);
    const key = searchParams.get("key");

    if (!key) {
      return NextResponse.json({ error: "key is required" }, { status: 400 });
    }

    await db.systemSetting.delete({ where: { key } });

    // Log the deletion
    try {
      await db.auditLog.create({
        data: {
          action: "system_setting_delete",
          entityType: "system_setting",
          entityId: key,
          adminId: session.userId,
          adminName: session.email,
          details: `Setting "${key}" deleted`,
        },
      });
    } catch {
      // AuditLog table might not exist
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Failed to delete system setting:", error);
    return NextResponse.json({ error: "Failed to delete setting" }, { status: 500 });
  }
});
