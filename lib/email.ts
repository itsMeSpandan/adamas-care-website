/**
 * lib/email.ts — Transactional email service via Resend.
 *
 * Sends booking confirmations and reminders. Failures are logged
 * but never block the booking flow (email is best-effort).
 */

import { Resend } from "resend";

const resendApiKey = process.env.RESEND_API_KEY;
const emailFrom = process.env.EMAIL_FROM || "Grace Salon <noreply@gracesalon.com>";

let resendClient: Resend | null = null;

function getResendClient(): Resend | null {
  if (resendClient) return resendClient;
  if (!resendApiKey) return null;
  resendClient = new Resend(resendApiKey);
  return resendClient;
}

export function isResendConfigured(): boolean {
  return !!resendApiKey;
}

// ─── Generic transactional email (used by notifyBooking) ─────────────────────────────

export interface TransactionalEmail {
  to: string;
  subject: string;
  html: string;
  /** Attachments (e.g. .ics calendars) — content is sent as-is (Buffer/base64). */
  attachments?: { filename: string; content: Buffer }[];
}

/**
 * Send an arbitrary transactional email. Best-effort boolean like the other
 * senders; never throws.
 */
export async function sendTransactionalEmail(msg: TransactionalEmail): Promise<boolean> {
  const client = getResendClient();
  if (!client) {
    console.warn(`[Email] Resend not configured — skipping "${msg.subject}" to ${msg.to}`);
    return false;
  }

  try {
    await client.emails.send({
      from: emailFrom,
      to: msg.to,
      subject: msg.subject,
      html: msg.html,
      ...(msg.attachments && msg.attachments.length > 0
        ? { attachments: msg.attachments.map((a) => ({ filename: a.filename, content: a.content })) }
        : {}),
    });
    console.log(`📧 ${msg.subject} sent to ${msg.to}`);
    return true;
  } catch (error) {
    console.error(`[Email] Failed to send "${msg.subject}" to ${msg.to}:`, error);
    return false;
  }
}

// ─── Verification OTP Email (signup) ─────────────────────────────────────────────────

interface VerificationOtpData {
  email: string;
  name: string;
  otp: string;
}

/**
 * Send a 6-digit account-verification code by email (replaces the old
 * WhatsApp OTP delivery). Best-effort boolean like the other senders.
 */
export async function sendVerificationOtpEmail(data: VerificationOtpData): Promise<boolean> {
  const client = getResendClient();
  if (!client) {
    console.warn("[Email] Resend not configured — skipping verification OTP email");
    return false;
  }

  try {
    await client.emails.send({
      from: emailFrom,
      to: data.email,
      subject: `Your Verification Code — Grace Salon`,
      html: `
        <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto;">
          <h2 style="color: #3D5A47;">Verify Your Email</h2>
          <p>Hi ${data.name},</p>
          <p>Use this 6-digit code to verify your Grace Salon account:</p>
          <div style="background: #F5F1EA; padding: 16px; border-radius: 8px; margin: 16px 0; text-align: center;">
            <span style="font-size: 28px; font-weight: 700; letter-spacing: 0.3em; color: #1F1F1F;">${data.otp}</span>
          </div>
          <p style="color: #666; font-size: 14px;">This code expires in <strong>15 minutes</strong>. Do not share it with anyone.</p>
          <p style="color: #666; font-size: 14px;">If you didn't create an account, you can safely ignore this email.</p>
          <hr style="border: none; border-top: 1px solid #eee; margin: 24px 0;" />
          <p style="color: #999; font-size: 12px;">Grace Salon — Hair That Moves. Skin That Glows.</p>
        </div>
      `,
    });
    console.log(`📧 Verification OTP sent to ${data.email}`);
    return true;
  } catch (error) {
    console.error(`[Email] Failed to send verification OTP to ${data.email}:`, error);
    return false;
  }
}

// ─── Password Reset Email ─────────────────────────────────────────────────────

interface PasswordResetData {
  email: string;
  name: string;
  resetUrl: string;
}

/**
 * Send a branded password-reset link email. The raw token lives only in the
 * emailed link — never in the database or (in production) the logs.
 * Best-effort: failures are logged and reported as `false`, never thrown.
 */
export async function sendPasswordResetEmail(data: PasswordResetData): Promise<boolean> {
  const client = getResendClient();
  if (!client) {
    console.warn("[Email] Resend not configured — skipping password reset email");
    return false;
  }

  try {
    await client.emails.send({
      from: emailFrom,
      to: data.email,
      subject: "Reset Your Password — Grace Salon",
      html: `
        <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto;">
          <h2 style="color: #3D5A47;">Reset Your Password</h2>
          <p>Hi ${data.name},</p>
          <p>We received a request to reset the password for your Grace Salon account.</p>
          <div style="background: #F5F1EA; padding: 16px; border-radius: 8px; margin: 16px 0; text-align: center;">
            <a href="${data.resetUrl}"
               style="display: inline-block; background: #3D5A47; color: #ffffff; padding: 12px 24px; border-radius: 8px; text-decoration: none; font-weight: 600;">
              Choose a New Password
            </a>
          </div>
          <p style="color: #666; font-size: 14px;">
            This link expires in <strong>15 minutes</strong> and can only be used once.
          </p>
          <p style="color: #666; font-size: 14px;">
            If you didn't request this, you can safely ignore this email — your password will not change.
          </p>
          <hr style="border: none; border-top: 1px solid #eee; margin: 24px 0;" />
          <p style="color: #999; font-size: 12px;">Grace Salon — Hair That Moves. Skin That Glows.</p>
        </div>
      `,
    });
    console.log(`📧 Password reset email sent to ${data.email}`);
    return true;
  } catch (error) {
    console.error(`[Email] Failed to send password reset to ${data.email}:`, error);
    return false;
  }
}
