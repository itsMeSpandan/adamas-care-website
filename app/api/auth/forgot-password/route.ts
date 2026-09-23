import { NextResponse } from "next/server";
import { rateLimit, getEmailKey } from "@/lib/rate-limit";

// Stage 3.1: Per-email + per-IP rate limiting for forgot-password
const limiter = rateLimit({ windowMs: 60_000, max: 3 }); // 3 attempts per minute

export const dynamic = "force-dynamic";

import { db } from "@/lib/db";
import { sendOtpEmail, isEmailJsConfigured } from "@/lib/emailjs";
import crypto from "crypto";

function generateOtp(): string {
  return crypto.randomInt(100000, 1000000).toString();
}

export async function POST(request: Request) {
  try {
    const { email } = await request.json();

    if (!email) {
      return NextResponse.json(
        { error: "Email is required" },
        { status: 400 }
      );
    }

    // Stage 3.1: Rate limit by email + IP (prevents brute-force against specific accounts)
    const key = getEmailKey(request, "forgot-password", email);
    const result = await limiter.checkAsync(key);

    if (!result.success) {
      return NextResponse.json(
        { error: "Too many attempts. Please try again later." },
        {
          status: 429,
          headers: {
            "Retry-After": String(Math.ceil(result.retryAfterMs / 1000)),
            "X-RateLimit-Limit": "3",
            "X-RateLimit-Remaining": "0",
          },
        }
      );
    }

    const user = await db.user.findUnique({ where: { email } });

    // Always return success to prevent email enumeration
    if (!user) {
      return NextResponse.json({
        message: "If an account exists with this email, an OTP has been sent.",
      });
    }

    // Invalidate any existing tokens for this user
    await db.passwordResetToken.updateMany({
      where: { userId: user.id, used: false },
      data: { used: true },
    });

    // Generate a 6-digit OTP
    const otp = generateOtp();
    const expiresAt = new Date(Date.now() + 10 * 60 * 1000); // 10 minutes

    await db.passwordResetToken.create({
      data: {
        token: otp,
        userId: user.id,
        expiresAt,
      },
    });

    // Stage 3.6: Never log OTP in production
    if (process.env.NODE_ENV !== "production") {
      console.log(`🔑 OTP for ${user.email}: ${otp}`);
    }

    // Send OTP via EmailJS
    if (isEmailJsConfigured()) {
      const emailResult = await sendOtpEmail(user.email, user.name, otp);

      if (!emailResult.success) {
        console.error("Failed to send OTP email:", emailResult.error);
        return NextResponse.json(
          { error: "Failed to send OTP. Please try again or contact support." },
          { status: 500 }
        );
      }

      console.log(`📧 OTP sent to ${user.email}`);
    }

    return NextResponse.json(
      {
        message: "If an account exists with this email, an OTP has been sent.",
      },
      {
        headers: {
          "X-RateLimit-Limit": "3",
          "X-RateLimit-Remaining": String(result.remaining),
        },
      }
    );
  } catch (error) {
    console.error("Forgot password error:", error);
    return NextResponse.json(
      { error: "Failed to process request" },
      { status: 500 }
    );
  }
}
