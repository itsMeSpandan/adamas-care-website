import { NextResponse } from "next/server";
import {
  rateLimit,
  getEmailKey,
  getRateLimitKey,
  getTrustedClientIp,
} from "@/lib/rate-limit";
import { rejectCrossOrigin } from "@/lib/csrf";
import { db } from "@/lib/db";
import { sendPasswordResetEmail } from "@/lib/email";
import crypto from "crypto";
import { z } from "zod";

// Per-account + per-IP rate limiting (both checked; either can 429).
const emailLimiter = rateLimit({ windowMs: 60_000, max: 3 }); // 3 requests/min/email
const ipLimiter = rateLimit({ windowMs: 60_000, max: 10 }); // 10 requests/min/IP

export const dynamic = "force-dynamic";

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

const forgotSchema = z.object({
  email: z.string().trim().min(1, "Email is required").max(254).regex(EMAIL_RE, "Please enter a valid email address"),
});

/** SHA-256 hex of a value — reset tokens are only ever stored hashed. */
function sha256(value: string): string {
  return crypto.createHash("sha256").update(value).digest("hex");
}

function rateLimitResponse(retryAfterMs: number, limit: number): NextResponse {
  return NextResponse.json(
    { error: "Too many attempts. Please try again later." },
    {
      status: 429,
      headers: {
        "Retry-After": String(Math.ceil(retryAfterMs / 1000)),
        "X-RateLimit-Limit": String(limit),
        "X-RateLimit-Remaining": "0",
      },
    }
  );
}

export async function POST(request: Request) {
  try {
    // ─── CSRF: reject cross-site browser requests ───
    const originError = rejectCrossOrigin(request);
    if (originError) return originError;

    let body: unknown;
    try {
      body = await request.json();
    } catch {
      return NextResponse.json({ error: "Email is required" }, { status: 400 });
    }

    const parsed = forgotSchema.safeParse(body);
    if (!parsed.success) {
      const msg = parsed.error.issues[0]?.message || "Email is required";
      return NextResponse.json({ error: msg }, { status: 400 });
    }
    const email = parsed.data.email.toLowerCase();

    // Rate limit per email AND per IP (either can trip).
    const emailKey = getEmailKey(request, "forgot-password", email);
    const emailResult = await emailLimiter.checkAsync(emailKey);
    if (!emailResult.success) {
      return rateLimitResponse(emailResult.retryAfterMs, 3);
    }
    const ipKey = getRateLimitKey(request, "forgot-password");
    const ipResult = await ipLimiter.checkAsync(ipKey);
    if (!ipResult.success) {
      return rateLimitResponse(ipResult.retryAfterMs, 10);
    }

    const genericMessage =
      "If an account exists with this email, a password reset link has been sent.";

    const user = await db.user.findUnique({ where: { email } });

    // Always the same response — no user enumeration, even when send fails.
    if (user) {
      // Invalidate any older unused tokens first.
      await db.passwordResetToken.updateMany({
        where: { userId: user.id, usedAt: null },
        data: { usedAt: new Date() },
      });

      // Raw token: 32 random bytes, base64url. Only its SHA-256 hash is stored.
      const rawToken = crypto.randomBytes(32).toString("base64url");
      const expiresAt = new Date(Date.now() + 15 * 60 * 1000); // 15 minutes

      await db.passwordResetToken.create({
        data: {
          tokenHash: sha256(rawToken),
          userId: user.id,
          expiresAt,
          requestIp: getTrustedClientIp(request),
        },
      });

      const baseUrl =
        process.env.NEXT_PUBLIC_BASE_URL ||
        new URL(request.url).origin;
      const resetUrl = `${baseUrl}/reset-password?token=${encodeURIComponent(rawToken)}`;

      // Never log the raw token in production.
      if (process.env.NODE_ENV !== "production") {
        console.log(`🔑 Password reset link for ${user.email}: ${resetUrl}`);
      }

      const sent = await sendPasswordResetEmail({
        email: user.email,
        name: user.name,
        resetUrl,
      });
      if (!sent) {
        // Keep the generic 200 — a 500 here would leak account existence.
        console.error(`[Auth] Password reset email could not be sent to ${user.email}`);
      }
    }

    return NextResponse.json(
      { message: genericMessage },
      {
        headers: {
          "X-RateLimit-Limit": "3",
          "X-RateLimit-Remaining": String(emailResult.remaining),
        },
      }
    );
  } catch (error) {
    console.error("Forgot password error:", error);
    return NextResponse.json({ error: "Failed to process request" }, { status: 500 });
  }
}
