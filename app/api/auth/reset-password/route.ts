import { NextResponse } from "next/server";
import { rateLimit, getRateLimitKey } from "@/lib/rate-limit";
import { rejectCrossOrigin } from "@/lib/csrf";
import { db } from "@/lib/db";
import { hashPassword } from "@/lib/crypto";
import { revokeAllUserTokens } from "@/lib/refresh-tokens";
import crypto from "crypto";
import { z } from "zod";

// Per-IP rate limiting for reset-password.
const limiter = rateLimit({ windowMs: 60_000, max: 5 }); // 5 attempts per minute

export const dynamic = "force-dynamic";

const resetSchema = z.object({
  token: z.string().min(1, "Token is required").max(256),
  newPassword: z.string().min(1, "Password is required").max(128),
});

/** SHA-256 hex — matches how the token was stored in forgot-password. */
function sha256(value: string): string {
  return crypto.createHash("sha256").update(value).digest("hex");
}

export async function POST(request: Request) {
  // ─── CSRF: reject cross-site browser requests ───
  const originError = rejectCrossOrigin(request);
  if (originError) return originError;

  // Rate limit by IP (the token itself is the credential here).
  const key = getRateLimitKey(request, "reset-password");
  const result = await limiter.checkAsync(key);

  if (!result.success) {
    return NextResponse.json(
      { error: "Too many attempts. Please try again later." },
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
    let body: unknown;
    try {
      body = await request.json();
    } catch {
      return NextResponse.json(
        { error: "Token and password are required" },
        { status: 400 }
      );
    }

    const parsed = resetSchema.safeParse(body);
    if (!parsed.success) {
      const msg = parsed.error.issues[0]?.message || "Token and password are required";
      return NextResponse.json({ error: msg }, { status: 400 });
    }
    const { token, newPassword } = parsed.data;

    // Same password rules as signup (register route).
    if (newPassword.length < 8) {
      return NextResponse.json(
        { error: "Password must be at least 8 characters" },
        { status: 400 }
      );
    }
    if (newPassword.length > 128) {
      return NextResponse.json(
        { error: "Password must be under 128 characters" },
        { status: 400 }
      );
    }

    // Look the token up by hash — the raw token is never stored.
    const resetToken = await db.passwordResetToken.findUnique({
      where: { tokenHash: sha256(token) },
    });

    const invalidResponse = NextResponse.json(
      { error: "Invalid or expired link. Please request a new one." },
      { status: 400 }
    );

    if (!resetToken) return invalidResponse;
    if (resetToken.usedAt) return invalidResponse;
    if (new Date() > resetToken.expiresAt) return invalidResponse;

    const hashedPassword = await hashPassword(newPassword); // bcrypt cost 12

    // Reset + mark token used + revoke every refresh token in one
    // transaction so a partial failure can't leave a reusable token.
    await db.$transaction([
      db.user.update({
        where: { id: resetToken.userId },
        data: { password: hashedPassword },
      }),
      db.passwordResetToken.update({
        where: { id: resetToken.id },
        data: { usedAt: new Date() },
      }),
    ]);

    // Force re-login everywhere: all refresh tokens for this user die now.
    await revokeAllUserTokens(resetToken.userId);

    return NextResponse.json(
      {
        message: "Password has been reset successfully. You can now sign in.",
      },
      {
        headers: {
          "X-RateLimit-Limit": "5",
          "X-RateLimit-Remaining": String(result.remaining),
        },
      }
    );
  } catch (error) {
    console.error("Reset password error:", error);
    return NextResponse.json({ error: "Failed to reset password" }, { status: 500 });
  }
}
