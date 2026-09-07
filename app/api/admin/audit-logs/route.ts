import { NextResponse } from "next/server";
import { requireRole } from "@/lib/require-auth";
import { db } from "@/lib/db";

export const dynamic = "force-dynamic";

export const GET = requireRole("admin", async () => {
  try {
    const logs = await db.auditLog.findMany({
      orderBy: { createdAt: "desc" },
      take: 500,
    });

    return NextResponse.json({ logs });
  } catch (error) {
    console.error("Failed to fetch audit logs:", error);
    return NextResponse.json(
      { error: "Failed to fetch audit logs" },
      { status: 500 }
    );
  }
});
