import { NextResponse } from "next/server";
import { requireRole } from "@/lib/require-auth";
import { getLoyaltyOverview } from "@/lib/loyalty";

export const dynamic = "force-dynamic";

// GET — Aggregate loyalty stats
export const GET = requireRole("admin", async () => {
  try {
    const overview = await getLoyaltyOverview();
    return NextResponse.json(overview);
  } catch (error) {
    console.error("Failed to fetch loyalty overview:", error);
    return NextResponse.json({ error: "Failed to fetch overview" }, { status: 500 });
  }
});
