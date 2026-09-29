import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getSessionFromRequest } from "@/lib/auth";
import { sendVerificationOtpEmail } from "@/lib/email";
import crypto from "crypto";

function sha256(value: string): string {
  return crypto.createHash("sha256").update(value).digest("hex");
}

export const dynamic = "force-dynamic";

function generateOtp(): string {
  return crypto.randomInt(100000, 1000000).toString();
}

/**
 * POST /api/auth/verify-email
 *
 * Two modes via `action` field:
 *   - "send": Generate and send a 6-digit OTP to the user's email address
 *   - "verify": Validate the OTP and mark emailVerified = true
 */
export async function POST(request: Request) {
  const session = await getSessionFromRequest(request);
  if (!session) {
    return NextResponse.json({ error: "Authentication required" }, { status: 401 });
  }

  try {
    const { action, otp } = await request.json();

    if (action === "send") {
      const user = await db.user.findUnique({ where: { id: session.userId } });
      if (!user) {
        return NextResponse.json({ error: "User not found" }, { status: 404 });
      }
      if (user.emailVerified) {
        return NextResponse.json({ message: "Account already verified" });
      }

      // Invalidate any existing verification tokens
      await db.emailVerificationToken.updateMany({
        where: { userId: user.id, usedAt: null },
        data: { usedAt: new Date() },
      });

      const newOtp = generateOtp();
      const expiresAt = new Date(Date.now() + 15 * 60 * 1000); // 15 minutes

      await db.emailVerificationToken.create({
        data: { otpHash: sha256(newOtp), userId: user.id, expiresAt },
      });

      if (process.env.NODE_ENV !== "production") {
        console.log(`🔑 Email verification OTP for ${user.email}: ${newOtp}`);
      }

      // Send OTP via email
      const sent = await sendVerificationOtpEmail({
        email: user.email,
        name: user.name,
        otp: newOtp,
      });
      if (!sent) {
        console.error("Failed to send verification OTP email");
        return NextResponse.json(
          { error: "Failed to send verification code. Please try again." },
          { status: 500 }
        );
      }

      return NextResponse.json({ message: "Verification code sent to your email" });
    }

    if (action === "verify") {
      if (!otp || typeof otp !== "string") {
        return NextResponse.json({ error: "OTP is required" }, { status: 400 });
      }

      const resetToken = await db.emailVerificationToken.findFirst({
        where: {
          userId: session.userId,
          otpHash: sha256(otp),
          usedAt: null,
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

      // Mark account as verified
      await db.user.update({
        where: { id: session.userId },
        data: { emailVerified: true },
      });

      // Mark OTP as used
      await db.emailVerificationToken.update({
        where: { id: resetToken.id },
        data: { usedAt: new Date() },
      });

      return NextResponse.json({ message: "Account verified successfully" });
    }

    return NextResponse.json({ error: "Invalid action. Use 'send' or 'verify'." }, { status: 400 });
  } catch (error) {
    console.error("Verification error:", error);
    return NextResponse.json({ error: "Failed to process verification" }, { status: 500 });
  }
}
