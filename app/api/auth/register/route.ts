import { NextResponse } from "next/server";
import { rateLimit, getRateLimitKey } from "@/lib/rate-limit";
import { db } from "@/lib/db";
import { hashPassword } from "@/lib/crypto";
import { setSessionCookies } from "@/lib/auth";
import { sendVerificationOtpEmail } from "@/lib/email";
import crypto from "crypto";

function sha256(value: string): string {
  return crypto.createHash("sha256").update(value).digest("hex");
}

const limiter = rateLimit({ windowMs: 60_000, max: 3 }); // 3 registrations per minute

export const dynamic = "force-dynamic";

function generateOtp(): string {
  return crypto.randomInt(100000, 1000000).toString();
}

export async function POST(request: Request) {
  const key = getRateLimitKey(request, "register");
  const result = await limiter.checkAsync(key);

  if (!result.success) {
    return NextResponse.json(
      { error: "Too many registration attempts. Please try again later." },
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
    const { name, email, password, gender, whatsappNumber } = await request.json();

    if (!name || !email || !password) {
      return NextResponse.json(
        { error: "Name, email, and password are required" },
        { status: 400 }
      );
    }

    // Phone number is optional contact info (verification goes by email).
    let cleanPhone = "";
    if (whatsappNumber && whatsappNumber.trim().length > 0) {
      cleanPhone = whatsappNumber.replace(/[^0-9+]/g, "");
      if (!cleanPhone.match(/^\+?[0-9]{10,15}$/)) {
        return NextResponse.json(
          { error: "Please enter a valid phone number (e.g., +91 98765 43210)" },
          { status: 400 }
        );
      }
    }

    // Validate gender if provided
    if (gender && !["male", "female", "other"].includes(gender)) {
      return NextResponse.json(
        { error: "Invalid gender value. Must be male, female, or other" },
        { status: 400 }
      );
    }

    // Validate email format
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      return NextResponse.json(
        { error: "Please enter a valid email address" },
        { status: 400 }
      );
    }

    // Validate password strength (minimum 8 characters)
    if (password.length < 8) {
      return NextResponse.json(
        { error: "Password must be at least 8 characters" },
        { status: 400 }
      );
    }

    if (password.length > 128) {
      return NextResponse.json(
        { error: "Password must be under 128 characters" },
        { status: 400 }
      );
    }

    const existingUser = await db.user.findUnique({ where: { email } });

    if (existingUser) {
      return NextResponse.json(
        { error: "An account with this email already exists" },
        { status: 409 }
      );
    }

    // Check if this phone number is already used by another account
    if (cleanPhone) {
      const existingPhone = await db.user.findFirst({
        where: { whatsappNumber: cleanPhone },
      });
      if (existingPhone) {
        return NextResponse.json(
          { error: "An account with this phone number already exists" },
          { status: 409 }
        );
      }
    }

    const hashedPassword = await hashPassword(password);

    const user = await db.user.create({
      data: {
        name: name.trim(),
        email: email.trim().toLowerCase(),
        password: hashedPassword,
        role: "user",
        gender: gender || null,
        whatsappNumber: cleanPhone,
        avatarUrl: `https://ui-avatars.com/api/?name=${encodeURIComponent(name)}&background=e8ddd3&color=7c6e5a`,
      },
    });

    // Set httpOnly session cookies
    await setSessionCookies({
      userId: user.id,
      role: user.role,
      email: user.email,
    });

    // ─── Auto-send verification OTP by email after signup ───
    let otpSent = false;
    const otp = generateOtp();
    const expiresAt = new Date(Date.now() + 15 * 60 * 1000); // 15 minutes

    try {
      await db.emailVerificationToken.create({
        data: { otpHash: sha256(otp), userId: user.id, expiresAt },
      });

      if (process.env.NODE_ENV !== "production") {
        console.log(`🔑 Email verification OTP for ${user.email}: ${otp}`);
      }

      otpSent = await sendVerificationOtpEmail({
        email: user.email,
        name: user.name,
        otp,
      });
    } catch (err) {
      console.error("[Register] Failed to send OTP:", err);
      // Don't block registration — OTP can be resent from verify page
    }

    // Return user without password
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const { password: _, ...userWithoutPassword } = user;

    return NextResponse.json(
      {
        user: userWithoutPassword,
        otpSent,
        message: otpSent
          ? "Account created! Check your email for the verification code."
          : "Account created! Please verify your email from your profile.",
      },
      {
        status: 201,
        headers: {
          "X-RateLimit-Limit": "3",
          "X-RateLimit-Remaining": String(result.remaining),
        },
      }
    );
  } catch (error) {
    console.error("Registration failed:", error);
    return NextResponse.json(
      { error: "Failed to create account" },
      { status: 500 }
    );
  }
}
