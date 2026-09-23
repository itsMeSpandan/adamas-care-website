import { NextResponse } from "next/server";
import { requireRole } from "@/lib/require-auth";
import { db } from "@/lib/db";
import { Prisma } from "@prisma/client";

export const dynamic = "force-dynamic";

/**
 * GET /api/admin/whatsapp-logs
 *
 * Returns paginated WhatsApp message logs with filtering.
 */
export const GET = requireRole("admin", async (request: Request) => {
  try {
    const { searchParams } = new URL(request.url);
    const page = Math.max(1, parseInt(searchParams.get("page") || "1", 10));
    const limit = Math.min(100, Math.max(1, parseInt(searchParams.get("limit") || "50", 10)));
    const messageType = searchParams.get("messageType");
    const status = searchParams.get("status");
    const phoneNumber = searchParams.get("phoneNumber");
    const from = searchParams.get("from");
    const to = searchParams.get("to");

    const where: Prisma.WhatsAppMessageLogWhereInput = {};

    if (messageType) {
      where.messageType = messageType;
    }
    if (status) {
      where.status = status;
    }
    if (phoneNumber) {
      where.phoneNumber = { contains: phoneNumber, mode: "insensitive" };
    }
    if (from || to) {
      where.createdAt = {};
      if (from) where.createdAt.gte = new Date(from);
      if (to) where.createdAt.lte = new Date(to);
    }

    const [logs, total] = await Promise.all([
      db.whatsAppMessageLog.findMany({
        where,
        orderBy: { createdAt: "desc" },
        skip: (page - 1) * limit,
        take: limit,
      }),
      db.whatsAppMessageLog.count({ where }),
    ]);

    // Compute summary stats
    const stats = await db.whatsAppMessageLog.groupBy({
      by: ["status"],
      _count: true,
      where: from || to ? { createdAt: where.createdAt } : {},
    });

    const statsByType = await db.whatsAppMessageLog.groupBy({
      by: ["messageType"],
      _count: true,
      where: from || to ? { createdAt: where.createdAt } : {},
    });

    return NextResponse.json({
      logs,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
      stats: {
        byStatus: stats.map((s) => ({ status: s.status, count: s._count })),
        byType: statsByType.map((s) => ({ type: s.messageType, count: s._count })),
      },
    });
  } catch (error) {
    console.error("Failed to fetch WhatsApp logs:", error);
    return NextResponse.json({ error: "Failed to fetch logs" }, { status: 500 });
  }
});
