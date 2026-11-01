import { NextResponse } from "next/server";
import { rateLimit, getRateLimitKey } from "@/lib/rate-limit";
import { rejectCrossOrigin } from "@/lib/csrf";
import { handleOAuthSignIn } from "@/lib/oauth-auth";

const limiter = rateLimit({ windowMs: 60_000, max: 5 }); // 5 Microsoft sign-ins per minute

export const dynamic = "force-dynamic";

/**
 * POST /api/auth/microsoft — Microsoft signup + login.
 *
 * Body: { credential: <Firebase ID token from signInWithPopup> }
 */
export async function POST(request: Request) {
  const originError = rejectCrossOrigin(request);
  if (originError) return originError;

  const key = getRateLimitKey(request, "microsoft");
  const result = await limiter.checkAsync(key);

  if (!result.success) {
    return NextResponse.json(
      { error: "Too many sign-in attempts. Please try again later." },
      {
        status: 429,
        headers: {
          "Retry-After": String(Math.ceil(result.retryAfterMs / 1000)),
          "X-RateLimit-Limit": "5",
          "X-RateLimit-Remaining": "0",
        },
      }
    );
  }

  try {
    const { credential } = await request.json();
    if (!credential || typeof credential !== "string") {
      return NextResponse.json(
        { error: "Missing Microsoft credential" },
        { status: 400 }
      );
    }

    const authResult = await handleOAuthSignIn({
      credential,
      expectedProvider: "microsoft.com",
    });

    if (!authResult.success) {
      return NextResponse.json(
        { error: authResult.error },
        { status: authResult.status }
      );
    }

    return NextResponse.json(
      { user: authResult.user, created: authResult.created },
      {
        headers: {
          "X-RateLimit-Limit": "5",
          "X-RateLimit-Remaining": String(result.remaining),
        },
      }
    );
  } catch (error) {
    console.error("Microsoft sign-in failed:", error);
    return NextResponse.json({ error: "Microsoft sign-in failed" }, { status: 500 });
  }
}
