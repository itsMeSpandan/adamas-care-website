import { NextResponse } from "next/server";
import { rateLimit, getRateLimitKey } from "@/lib/rate-limit";
import { rejectCrossOrigin } from "@/lib/csrf";
import { handleOAuthSignIn } from "@/lib/oauth-auth";

const limiter = rateLimit({ windowMs: 60_000, max: 5 }); // 5 Google sign-ins per minute

export const dynamic = "force-dynamic";

/**
 * POST /api/auth/google — Google signup + login in one step.
 *
 * Body: { credential: <Firebase ID token from signInWithPopup> }
 */
export async function POST(request: Request) {
  const originError = rejectCrossOrigin(request);
  if (originError) return originError;

  const key = getRateLimitKey(request, "google");
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
        { error: "Missing Google credential" },
        { status: 400 }
      );
    }

    const authResult = await handleOAuthSignIn({
      credential,
      expectedProvider: "google.com",
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
    console.error("Google sign-in failed:", error);
    return NextResponse.json({ error: "Google sign-in failed" }, { status: 500 });
  }
}
