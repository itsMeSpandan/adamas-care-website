import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { requireRole } from "@/lib/require-auth";
import { getSessionFromRequest } from "@/lib/auth";
import { logAudit, getClientIp } from "@/lib/audit";
import { revalidatePath } from "next/cache";

export const dynamic = "force-dynamic";

/**
 * PUT /api/admin/hero-images/reorder
 *
 * Update sortOrder for all images based on the provided array of image IDs.
 */
export const PUT = requireRole("admin", async (request: Request) => {
  const session = await getSessionFromRequest(request);
  if (!session) {
    return NextResponse.json({ error: "Authentication required" }, { status: 401 });
  }

  let body: { order?: unknown };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  if (!Array.isArray(body.order) || !body.order.every((id) => typeof id === "string")) {
    return NextResponse.json(
      { error: "Provide an 'order' array containing image IDs." },
      { status: 400 }
    );
  }

  const order = body.order as string[];

  try {
    await db.$transaction(
      order.map((id, index) =>
        db.heroImage.update({
          where: { id },
          data: { sortOrder: index },
        })
      )
    );

    logAudit({
      action: "hero_image_reorder",
      entityType: "hero_image",
      adminId: session.userId,
      adminName: session.email,
      details: `Reordered ${order.length} hero images`,
      ip: getClientIp(request),
    });

    revalidatePath("/");
    revalidatePath("/hero-images");

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Failed to reorder hero images:", error);
    return NextResponse.json({ error: "Failed to update image order" }, { status: 500 });
  }
});
