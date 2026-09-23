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

// ─── Booking Confirmation Email ─────────────────────────────────────────────

interface BookingConfirmationData {
  customerName: string;
  customerEmail: string;
  services: { name: string; duration: number; price: number }[];
  employeeName: string;
  date: string;
  slotStart: string;
  slotEnd: string;
  totalPrice: number;
  bookingId: string;
}

export async function sendBookingConfirmation(data: BookingConfirmationData): Promise<boolean> {
  const client = getResendClient();
  if (!client) {
    console.warn("[Email] Resend not configured — skipping booking confirmation");
    return false;
  }

  const serviceList = data.services
    .map((s) => `<li>${s.name} — ${s.duration} min — ₹${s.price.toFixed(0)}</li>`)
    .join("");

  try {
    await client.emails.send({
      from: emailFrom,
      to: data.customerEmail,
      subject: `Booking Confirmed — Grace Salon`,
      html: `
        <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto;">
          <h2 style="color: #3D5A47;">Booking Confirmed ✅</h2>
          <p>Hi ${data.customerName},</p>
          <p>Your appointment at <strong>Grace Salon</strong> has been confirmed.</p>
          <div style="background: #F5F1EA; padding: 16px; border-radius: 8px; margin: 16px 0;">
            <p><strong>Specialist:</strong> ${data.employeeName}</p>
            <p><strong>Date:</strong> ${data.date}</p>
            <p><strong>Time:</strong> ${data.slotStart} — ${data.slotEnd}</p>
            <p><strong>Services:</strong></p>
            <ul>${serviceList}</ul>
            <p style="font-size: 18px; margin-top: 12px;"><strong>Total: ₹${data.totalPrice.toFixed(0)}</strong></p>
          </div>
          <p style="color: #666; font-size: 14px;">Booking ID: ${data.bookingId}</p>
          <p style="color: #666; font-size: 14px;">Need to cancel? Please do so at least 4 hours before your appointment.</p>
          <hr style="border: none; border-top: 1px solid #eee; margin: 24px 0;" />
          <p style="color: #999; font-size: 12px;">Grace Salon — Hair That Moves. Skin That Glows.</p>
        </div>
      `,
    });
    console.log(`📧 Booking confirmation sent to ${data.customerEmail}`);
    return true;
  } catch (error) {
    console.error(`[Email] Failed to send booking confirmation to ${data.customerEmail}:`, error);
    return false;
  }
}

// ─── Reminder Email ─────────────────────────────────────────────────────────

interface ReminderData {
  customerName: string;
  customerEmail: string;
  services: { name: string }[];
  employeeName: string;
  date: string;
  slotStart: string;
  slotEnd: string;
  hoursBefore: 24 | 2;
}

export async function sendReminder(data: ReminderData): Promise<boolean> {
  const client = getResendClient();
  if (!client) {
    console.warn("[Email] Resend not configured — skipping reminder");
    return false;
  }

  const serviceNames = data.services.map((s) => s.name).join(", ");
  const urgency = data.hoursBefore === 2 ? "tomorrow" : `in ${data.hoursBefore} hours`;

  try {
    await client.emails.send({
      from: emailFrom,
      to: data.customerEmail,
      subject: `Appointment Reminder — ${data.hoursBefore}h — Grace Salon`,
      html: `
        <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto;">
          <h2 style="color: #3D5A47;">Appointment Reminder ⏰</h2>
          <p>Hi ${data.customerName},</p>
          <p>This is a friendly reminder that your appointment at <strong>Grace Salon</strong> is ${urgency}.</p>
          <div style="background: #F5F1EA; padding: 16px; border-radius: 8px; margin: 16px 0;">
            <p><strong>Specialist:</strong> ${data.employeeName}</p>
            <p><strong>Date:</strong> ${data.date}</p>
            <p><strong>Time:</strong> ${data.slotStart} — ${data.slotEnd}</p>
            <p><strong>Services:</strong> ${serviceNames}</p>
          </div>
          <p style="color: #666; font-size: 14px;">Need to reschedule? Please do so at least 4 hours before your appointment.</p>
          <hr style="border: none; border-top: 1px solid #eee; margin: 24px 0;" />
          <p style="color: #999; font-size: 12px;">Grace Salon — Hair That Moves. Skin That Glows.</p>
        </div>
      `,
    });
    console.log(`📧 ${data.hoursBefore}h reminder sent to ${data.customerEmail}`);
    return true;
  } catch (error) {
    console.error(`[Email] Failed to send reminder to ${data.customerEmail}:`, error);
    return false;
  }
}
