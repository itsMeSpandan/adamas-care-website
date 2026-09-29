import { NextResponse } from "next/server";
import { rateLimit, getRateLimitKey } from "@/lib/rate-limit";
import { rejectCrossOrigin } from "@/lib/csrf";
import { getSessionFromRequest } from "@/lib/auth";
import { db } from "@/lib/db";
import { z } from "zod";

export const dynamic = "force-dynamic";

const limiter = rateLimit({ windowMs: 60_000, max: 20 }); // 20 registrations/min/IP

const registerSchema = z.object({
  token: z.string().min(1).max(4096),
  platform: z.enum(["android", "web"]),
});

/**
 * POST /api/devices/register
 * Body: { token, platform } — auth required.
 * Upserts by unique token, refreshes lastSeenAt, un-revokes on re-register.
 */
export async function POST(request: Request) {
  const originError = rejectCrossOrigin(request);
  if (originError) return originError;

  const session = await getSessionFromRequest(request);
  if (!session) {
    return NextResponse.json({ error: "Authentication required" }, { status: 401 });
  }

  const key = getRateLimitKey(request, "devices-register");
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

  const parsed = registerSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid request body" }, { status: 400 });
  }

  const { token, platform } = parsed.data;
  const userAgent = request.headers.get("user-agent")?.slice(0, 512) || null;

  try {
    const existing = await db.deviceToken.findUnique({ where: { token } });

    if (existing) {
      // Same device re-registering (or a token migrating between accounts):
      // refresh it for the current session's user.
      await db.deviceToken.update({
        where: { token },
        data: {
          userId: session.userId,
          platform,
          userAgent,
          lastSeenAt: new Date(),
          revokedAt: null,
        },
      });
    } else {
      await db.deviceToken.create({
        data: { userId: session.userId, token, platform, userAgent },
      });
    }

    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error("[Devices] Register failed:", error);
    return NextResponse.json({ error: "Failed to register device" }, { status: 500 });
  }
}
