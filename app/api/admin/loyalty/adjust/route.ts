import { NextResponse } from "next/server";
import { requireRole } from "@/lib/require-auth";
import { adjustPoints } from "@/lib/loyalty";
import { rateLimit, getRateLimitKey } from "@/lib/rate-limit";

const limiter = rateLimit({ windowMs: 60_000, max: 10 });

export const dynamic = "force-dynamic";

// POST — Manual point adjustment for a user
export const POST = requireRole("admin", async (request: Request) => {
  const key = getRateLimitKey(request, "loyalty-adjust");
  const result = await limiter.checkAsync(key);

  if (!result.success) {
    return NextResponse.json(
      { error: "Too many attempts. Please try again later." },
      { status: 429, headers: { "Retry-After": String(Math.ceil(result.retryAfterMs / 1000)) } }
    );
  }

  try {
    const { userId, points, note } = await request.json();

    if (!userId || points === undefined || !note) {
      return NextResponse.json({ error: "userId, points, and note are required" }, { status: 400 });
    }

    if (typeof points !== "number" || !Number.isInteger(points) || points === 0) {
      return NextResponse.json({ error: "points must be a non-zero integer" }, { status: 400 });
    }

    const transaction = await adjustPoints(userId, points, note);
    if (!transaction) {
      return NextResponse.json({ message: "No adjustment needed" });
    }

    return NextResponse.json({ transaction }, { status: 201 });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to adjust points";
    return NextResponse.json({ error: message }, { status: 400 });
  }
});
