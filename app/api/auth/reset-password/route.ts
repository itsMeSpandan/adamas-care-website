import { NextResponse } from "next/server";
import { rateLimit, getRateLimitKey, getEmailKey } from "@/lib/rate-limit";

// Stage 3.1: Per-email + per-IP rate limiting for reset-password
const limiter = rateLimit({ windowMs: 60_000, max: 5 }); // 5 attempts per minute

export const dynamic = "force-dynamic";

import { db } from "@/lib/db";
import bcrypt from "bcrypt";

const BCRYPT_ROUNDS = 12;

export async function POST(request: Request) {
  // Stage 3.1: Rate limit by email + IP (prevents brute-force against specific accounts)
  // Clone request to read body for email before consuming it
  let rateLimitEmail = "";
  try {
    const cloned = request.clone();
    const body = await cloned.json();
    rateLimitEmail = body.email || "";
  } catch { /* will fail validation below */ }
  const key = rateLimitEmail ? getEmailKey(request, "reset-password", rateLimitEmail) : getRateLimitKey(request, "reset-password");
  const result = limiter.check(key);

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
    const { email, otp, password } = await request.json();

    if (!email || !otp || !password) {
      return NextResponse.json(
        { error: "Email, OTP, and password are required" },
        { status: 400 }
      );
    }

    if (password.length < 6) {
      return NextResponse.json(
        { error: "Password must be at least 6 characters" },
        { status: 400 }
      );
    }

    // Find the user
    const user = await db.user.findUnique({ where: { email } });
    if (!user) {
      return NextResponse.json(
        { error: "Invalid email or OTP" },
        { status: 400 }
      );
    }

    // Find the OTP record for this user
    const resetToken = await db.passwordResetToken.findFirst({
      where: {
        userId: user.id,
        token: otp,
        used: false,
      },
      orderBy: { createdAt: "desc" },
    });

    if (!resetToken) {
      return NextResponse.json(
        { error: "Invalid or expired OTP. Please request a new one." },
        { status: 400 }
      );
    }

    if (new Date() > resetToken.expiresAt) {
      return NextResponse.json(
        { error: "OTP has expired. Please request a new one." },
        { status: 400 }
      );
    }

    // Hash the new password before storing
    const hashedPassword = await bcrypt.hash(password, BCRYPT_ROUNDS);

    await db.user.update({
      where: { id: user.id },
      data: { password: hashedPassword },
    });

    // Mark the OTP as used
    await db.passwordResetToken.update({
      where: { id: resetToken.id },
      data: { used: true },
    });

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
    return NextResponse.json(
      { error: "Failed to reset password" },
      { status: 500 }
    );
  }
}
