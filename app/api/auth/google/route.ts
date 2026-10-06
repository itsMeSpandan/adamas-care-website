import { NextResponse } from "next/server";
import { rateLimit, getRateLimitKey } from "@/lib/rate-limit";
import { rejectCrossOrigin } from "@/lib/csrf";
import { db } from "@/lib/db";
import { hashPassword } from "@/lib/crypto";
import { setSessionCookies } from "@/lib/auth";
import { isFirebaseConfigured, verifyGoogleIdToken } from "@/lib/firebase-admin";
import crypto from "crypto";

const limiter = rateLimit({ windowMs: 60_000, max: 5 }); // 5 Google sign-ins per minute

export const dynamic = "force-dynamic";

/**
 * POST /api/auth/google — Google signup + login in one step.
 *
 * Body: { credential: <Firebase ID token from signInWithPopup> }
 *
 * 1. Verify the ID token server-side (signature, expiry, audience) via
 *    firebase-admin — the client is never trusted about its own identity.
 * 2. Require email_verified (Google always verifies; don't log people in
 *    on an unverified claim from a non-Google provider on the project).
 * 3. Find the user by email; if missing, create one (first click =
 *    signup) with an unusable random password so password auth stays
 *    disabled until they set one via forgot-password.
 * 4. Issue the same httpOnly session + refresh cookies as email login.
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

  if (!isFirebaseConfigured()) {
    return NextResponse.json(
      { error: "Google sign-in is not configured on the server." },
      { status: 503 }
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

    const decoded = await verifyGoogleIdToken(credential);
    if (!decoded) {
      return NextResponse.json(
        { error: "Google sign-in failed. Please try again." },
        { status: 401 }
      );
    }

    const email = decoded.email?.trim().toLowerCase();
    if (!email) {
      return NextResponse.json(
        { error: "Your Google account has no email address." },
        { status: 400 }
      );
    }
    if (decoded.email_verified !== true) {
      return NextResponse.json(
        { error: "Your Google account email is not verified." },
        { status: 403 }
      );
    }

    // Does this email already exist as a normal email/password account?
    // Case-insensitive match (register stores lowercased, but legacy rows may
    // not be) so Google sign-in REUSES the existing password account instead
    // of creating a duplicate — first click of "Sign in with Google" for an
    // address that already registered with a password logs into that account.
    let user = await db.user.findFirst({
      where: { email: { equals: email, mode: "insensitive" } },
    });
    let created = false;

    if (!user) {
      // First Google sign-in = signup. Random 128-char password → bcrypt
      // hash; nobody knows it, so password login is effectively off until
      // the user sets a real password via the email reset flow.
      const name = decoded.name?.trim() || email.split("@")[0];
      const randomPassword = crypto.randomBytes(48).toString("base64url");
      const hashedPassword = await hashPassword(randomPassword);

      try {
        user = await db.user.create({
          data: {
            name,
            email,
            password: hashedPassword,
            role: "user",
            gender: null,
            avatarUrl:
              decoded.picture ||
              `https://ui-avatars.com/api/?name=${encodeURIComponent(name)}&background=e8ddd3&color=7c6e5a`,
            emailVerified: true, // Google verified this address for us
          },
        });
        created = true;
      } catch (err) {
        // Unique-email race: two tabs signed up simultaneously — re-read.
        const isUniqueViolation =
          err instanceof Error && "code" in err && (err as { code: string }).code === "P2002";
        if (!isUniqueViolation) throw err;
        user = await db.user.findFirst({
          where: { email: { equals: email, mode: "insensitive" } },
        });
        if (!user) throw err;
      }
    }

    await setSessionCookies({
      userId: user.id,
      role: user.role,
      email: user.email,
    });

    // Return user without password
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const { password: _, ...userWithoutPassword } = user;

    return NextResponse.json(
      { user: userWithoutPassword, created },
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
