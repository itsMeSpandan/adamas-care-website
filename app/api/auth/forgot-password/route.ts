import { NextResponse } from "next/server";
import { rateLimit, getRateLimitKey } from "@/lib/rate-limit";

const limiter = rateLimit({ windowMs: 60_000, max: 3 }); // 3 attempts per minute

export const dynamic = "force-dynamic";

import { db } from "@/lib/db";
import { sendOtpEmail, isEmailJsConfigured } from "@/lib/emailjs";
import crypto from "crypto";

function generateOtp(): string {
  return crypto.randomInt(100000, 1000000).toString();
}

export async function POST(request: Request) {
  const key = getRateLimitKey(request, "forgot-password");
  const result = limiter.check(key);

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

  try {
    const { email } = await request.json();

    if (!email) {
      return NextResponse.json(
        { error: "Email is required" },
        { status: 400 }
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

    // Send OTP via EmailJS
    if (isEmailJsConfigured()) {
      const emailResult = await sendOtpEmail(user.email, user.name, otp);

      if (!emailResult.success) {
        console.error("Failed to send OTP email:", emailResult.error);
        // In development, log the OTP so it can be tested without EmailJS
        if (process.env.NODE_ENV === "development") {
          console.log(`\n🔑 OTP for ${user.email}: ${otp}\n`);
        }
        return NextResponse.json(
          { error: "Failed to send OTP. Please try again or contact support." },
          { status: 500 }
        );
      }

      console.log(`📧 OTP sent to ${user.email}`);
    } else {
      // Fallback: log OTP to console (for development without EmailJS)
      console.log(`\n🔑 OTP for ${user.email}: ${otp}\n`);
    }

    return NextResponse.json(
      {
        message: "If an account exists with this email, an OTP has been sent.",
        // In development, include OTP in response for testing
        ...(process.env.NODE_ENV === "development" ? { otp } : {}),
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
