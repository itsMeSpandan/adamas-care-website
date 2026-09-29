import { NextResponse } from "next/server";
import { rateLimit, getRateLimitKey } from "@/lib/rate-limit";
import { rejectCrossOrigin } from "@/lib/csrf";
import { getSessionFromRequest } from "@/lib/auth";
import { db } from "@/lib/db";
import { z } from "zod";

export const dynamic = "force-dynamic";

const limiter = rateLimit({ windowMs: 60_000, max: 20 });

const unregisterSchema = z.object({
  token: z.string().min(1).max(4096),
});

/**
 * POST /api/devices/unregister
 * Body: { token } — auth required. Sets revokedAt (soft delete) so the
 * token is excluded from future push fan-out but remains auditable.
 * Returns ok even when the token is unknown (idempotent).
 */
export async function POST(request: Request) {
  const originError = rejectCrossOrigin(request);
  if (originError) return originError;

  const session = await getSessionFromRequest(request);
  if (!session) {
    return NextResponse.json({ error: "Authentication required" }, { status: 401 });
  }

  const key = getRateLimitKey(request, "devices-unregister");
  const result = await limiter.checkAsync(key);
  if (!result.success) {
    return NextResponse.json(
      { error: "Too many attempts. Please try again later." },
      { status: 429, headers: { "Retry-After": String(Math.ceil(result.retryAfterMs / 1000)) } }
    );
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const parsed = unregisterSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid request body" }, { status: 400 });
  }

  try {
    const existing = await db.deviceToken.findUnique({ where: { token: parsed.data.token } });
    // Only the owner may revoke; unknown tokens still return ok (no probing).
    if (existing && existing.userId === session.userId && !existing.revokedAt) {
      await db.deviceToken.update({
        where: { id: existing.id },
        data: { revokedAt: new Date() },
      });
    }
    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error("[Devices] Unregister failed:", error);
    return NextResponse.json({ error: "Failed to unregister device" }, { status: 500 });
  }
}
