import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getSession } from "@/lib/auth";
import { adminFeedbackUpdateSchema } from "@/lib/feedback";
import { logAudit, getClientIp } from "@/lib/audit";
import type { Prisma } from "@prisma/client";

export const dynamic = "force-dynamic";

/**
 * PATCH /api/admin/feedbacks/[id]
 *
 * Updates follow-up workflow status and private admin notes.
 * Automatically logs status changes into AuditLog.
 */
export async function PATCH(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getSession();
    if (!session || session.role !== "admin") {
      return NextResponse.json({ error: "Unauthorized. Admin role required." }, { status: 403 });
    }

    const body = await request.json();
    const parsed = adminFeedbackUpdateSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: "Invalid input", details: parsed.error.flatten() },
        { status: 400 }
      );
    }

    const existing = await db.feedback.findUnique({
      where: { id: params.id },
      select: { id: true, status: true, bookingId: true },
    });

    if (!existing) {
      return NextResponse.json({ error: "Feedback not found" }, { status: 404 });
    }

    const { status, adminNotes } = parsed.data;
    const updateData: Prisma.FeedbackUpdateInput = {};

    if (status) {
      updateData.status = status;
      updateData.reviewedBy = session.userId;
      if (status === "RESOLVED") {
        updateData.resolvedAt = new Date();
      } else if (existing.status === "RESOLVED") {
        updateData.resolvedAt = null;
      }
    }

    if (adminNotes !== undefined) {
      updateData.adminNotes = adminNotes;
    }

    const updated = await db.feedback.update({
      where: { id: params.id },
      data: updateData,
    });

    // Write to audit log if status changed
    if (status && status !== existing.status) {
      await logAudit({
        action: "feedback_status_change",
        entityType: "feedback",
        entityId: params.id,
        adminId: session.userId,
        adminName: session.email,
        adminEmail: session.email,
        details: JSON.stringify({
          from: existing.status,
          to: status,
          bookingId: existing.bookingId,
        }),
        ip: getClientIp(request),
      });
    }

    return NextResponse.json({ success: true, feedback: updated });
  } catch (error) {
    console.error("[Admin Feedback Update Error]:", error);
    return NextResponse.json({ error: "Failed to update feedback" }, { status: 500 });
  }
}
