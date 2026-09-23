import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getSessionFromRequest } from "@/lib/auth";
import { sendWhatsAppOtp, isWhatsAppConfigured } from "@/lib/whatsapp";
import crypto from "crypto";

export const dynamic = "force-dynamic";

function generateOtp(): string {
  return crypto.randomInt(100000, 1000000).toString();
}

/**
 * POST /api/auth/verify-email (now WhatsApp verification)
 *
 * Two modes via `action` field:
 *   - "send": Generate and send a 6-digit OTP to the user's WhatsApp number
 *   - "verify": Validate the OTP and mark emailVerified = true (used for both email and WhatsApp)
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
      if (!user.whatsappNumber) {
        return NextResponse.json(
          { error: "No WhatsApp number on file. Please update your profile first." },
          { status: 400 }
        );
      }

      // Invalidate any existing verification tokens
      await db.passwordResetToken.updateMany({
        where: { userId: user.id, used: false },
        data: { used: true },
      });

      const newOtp = generateOtp();
      const expiresAt = new Date(Date.now() + 15 * 60 * 1000); // 15 minutes

      await db.passwordResetToken.create({
        data: { token: newOtp, userId: user.id, expiresAt },
      });

      if (process.env.NODE_ENV !== "production") {
        console.log(`🔑 WhatsApp verification OTP for ${user.whatsappNumber}: ${newOtp}`);
      }

      // Send OTP via WhatsApp
      if (isWhatsAppConfigured()) {
        const sent = await sendWhatsAppOtp(user.whatsappNumber, newOtp);
        if (!sent) {
          console.error("Failed to send WhatsApp OTP");
          return NextResponse.json(
            { error: "Failed to send verification code. Please try again." },
            { status: 500 }
          );
        }
      }

      return NextResponse.json({ message: "Verification code sent to your WhatsApp" });
    }

    if (action === "verify") {
      if (!otp || typeof otp !== "string") {
        return NextResponse.json({ error: "OTP is required" }, { status: 400 });
      }

      const resetToken = await db.passwordResetToken.findFirst({
        where: {
          userId: session.userId,
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

      // Mark account as verified
      await db.user.update({
        where: { id: session.userId },
        data: { emailVerified: true },
      });

      // Mark OTP as used
      await db.passwordResetToken.update({
        where: { id: resetToken.id },
        data: { used: true },
      });

      return NextResponse.json({ message: "Account verified successfully" });
    }

    return NextResponse.json({ error: "Invalid action. Use 'send' or 'verify'." }, { status: 400 });
  } catch (error) {
    console.error("Verification error:", error);
    return NextResponse.json({ error: "Failed to process verification" }, { status: 500 });
  }
}
