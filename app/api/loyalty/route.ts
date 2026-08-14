import { NextResponse } from "next/server";
import { requireAuth } from "@/lib/require-auth";
import { getSessionFromRequest } from "@/lib/auth";
import { getLoyaltyHistory } from "@/lib/loyalty";

export const dynamic = "force-dynamic";

export const GET = requireAuth(async (request: Request) => {
  const session = await getSessionFromRequest(request);
  if (!session) {
    return NextResponse.json({ error: "Authentication required" }, { status: 401 });
  }

  try {
    const { searchParams } = new URL(request.url);
    const page = Math.max(1, parseInt(searchParams.get("page") || "1", 10));
    const limit = Math.min(50, Math.max(1, parseInt(searchParams.get("limit") || "20", 10)));

    const data = await getLoyaltyHistory(session.userId, page, limit);
    return NextResponse.json(data);
  } catch (error) {
    // Detailed error logging for debugging the loyalty query
    console.error("=== Loyalty API Error ===");
    console.error("userId:", session?.userId);
    console.error("Error message:", error instanceof Error ? error.message : String(error));
    console.error("Error stack:", error instanceof Error ? error.stack : "(no stack)");
    console.error("========================");
    return NextResponse.json(
      { error: "Failed to fetch loyalty data. Please try again." },
      { status: 500 }
    );
  }
});
