import { NextResponse } from "next/server";
import { rateLimit, getRateLimitKey } from "@/lib/rate-limit";

const limiter = rateLimit({ windowMs: 60_000, max: 3 }); // 3 attempts per minute

export const dynamic = "force-dynamic";

import { db } from "@/lib/db";
import { resend, isEmailConfigured } from "@/lib/resend";
import { BRAND } from "@/lib/brand";
import crypto from "crypto";

function passwordResetEmailHtml(userName: string, resetUrl: string): string {
  return `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>Reset Your Password</title>
</head>
<body style="margin:0;padding:0;background-color:#FAF7F2;font-family:Georgia,serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background-color:#FAF7F2;padding:40px 20px;">
    <tr>
      <td align="center">
        <table width="100%" cellpadding="0" cellspacing="0" style="max-width:480px;background-color:#ffffff;border-radius:16px;overflow:hidden;box-shadow:0 2px 16px rgba(44,32,22,0.06);">
          <tr>
            <td style="padding:32px 40px 16px;text-align:center;">
              <div style="width:56px;height:56px;border-radius:50%;background-color:#F0EAE0;margin:0 auto 16px;line-height:56px;">
                <span style="font-size:24px;">🔐</span>
              </div>
              <h1 style="margin:0;font-size:22px;color:#6B4E32;font-weight:600;">Reset Your Password</h1>
            </td>
          </tr>
          <tr>
            <td style="padding:0 40px 24px;">
              <p style="margin:0 0 16px;font-size:15px;color:#4A3420;line-height:1.6;">
                Hi ${userName},
              </p>
              <p style="margin:0 0 24px;font-size:15px;color:#4A3420;line-height:1.6;">
                We received a request to reset the password for your ${BRAND.name} account. Click the button below to set a new password. This link expires in <strong>1 hour</strong>.
              </p>
              <table width="100%" cellpadding="0" cellspacing="0">
                <tr>
                  <td align="center">
                    <a href="${resetUrl}" style="display:inline-block;background-color:#8C6A48;color:#ffffff;font-size:15px;font-weight:500;text-decoration:none;padding:14px 32px;border-radius:12px;">
                      Reset Password
                    </a>
                  </td>
                </tr>
              </table>
              <p style="margin:24px 0 0;font-size:13px;color:#C8A882;line-height:1.6;">
                If the button doesn't work, copy and paste this link into your browser:<br />
                <a href="${resetUrl}" style="color:#8C6A48;word-break:break-all;">${resetUrl}</a>
              </p>
            </td>
          </tr>
          <tr>
            <td style="padding:20px 40px;border-top:1px solid #F0EAE0;">
              <p style="margin:0;font-size:12px;color:#C8A882;text-align:center;line-height:1.6;">
                If you didn't request this email, you can safely ignore it.<br />
                ${BRAND.name} &middot; ${BRAND.address}
              </p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>`;
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
        message: "If an account exists with this email, a reset link has been sent.",
      });
    }

    // Invalidate any existing tokens for this user
    await db.passwordResetToken.updateMany({
      where: { userId: user.id, used: false },
      data: { used: true },
    });

    // Generate a secure token
    const token = crypto.randomBytes(32).toString("hex");
    const expiresAt = new Date(Date.now() + 60 * 60 * 1000); // 1 hour

    await db.passwordResetToken.create({
      data: {
        token,
        userId: user.id,
        expiresAt,
      },
    });

    const resetUrl = `${process.env.NEXT_PUBLIC_BASE_URL || "http://localhost:3000"}/reset-password?token=${token}`;

    // Send email via Resend if configured, otherwise log to console
    if (isEmailConfigured() && resend) {
      try {
        const { data, error } = await resend.emails.send({
          from: process.env.EMAIL_FROM || "onboarding@resend.dev",
          to: user.email,
          subject: `Reset Your Password — ${BRAND.name}`,
          html: passwordResetEmailHtml(user.name, resetUrl),
        });

        if (error) {
          console.error("Resend API error:", JSON.stringify(error, null, 2));
          console.log(`\n🔑 Password Reset Link (email failed, using fallback) for ${user.email}:\n${resetUrl}\n`);
          return NextResponse.json(
            { error: "Failed to send reset email. Please try again or contact support." },
            { status: 500 }
          );
        }

        console.log(`📧 Password reset email sent to ${user.email} (id: ${data?.id})`);
      } catch (emailError) {
        console.error("Failed to send reset email:", emailError);
        console.log(`\n🔑 Password Reset Link (email failed, using fallback) for ${user.email}:\n${resetUrl}\n`);
        return NextResponse.json(
          { error: "Failed to send reset email. Please try again or contact support." },
          { status: 500 }
        );
      }
    } else {
      console.log(`\n🔑 Password Reset Link for ${user.email}:\n${resetUrl}\n`);
    }

    return NextResponse.json({
      message: "If an account exists with this email, a reset link has been sent.",
    }, {
      headers: {
        "X-RateLimit-Limit": "3",
        "X-RateLimit-Remaining": String(result.remaining),
      },
    });
  } catch (error) {
    console.error("Forgot password error:", error);
    return NextResponse.json({ error: "Failed to process request" }, { status: 500 });
  }
}
