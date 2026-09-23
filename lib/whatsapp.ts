/**
 * lib/whatsapp.ts — WhatsApp Cloud API integration for booking confirmations.
 *
 * Uses Meta's official WhatsApp Cloud API (free tier).
 * Messages are best-effort: failures are logged but never block the booking flow.
 *
 * All API calls are logged to WhatsAppMessageLog for audit/debugging.
 * The business phone number can be overridden via SystemSettings.
 *
 * Requires manual setup: see WHATSAPP_SETUP.md
 */

import { db } from "@/lib/db";

const PHONE_NUMBER_ID = process.env.WHATSAPP_PHONE_NUMBER_ID;
const ACCESS_TOKEN = process.env.WHATSAPP_ACCESS_TOKEN;
const TEMPLATE_NAME = process.env.WHATSAPP_TEMPLATE_NAME || "booking_confirmation";
// Graph API version — bump via env when Meta deprecates the current one.
const API_VERSION = process.env.WHATSAPP_API_VERSION || "v25.0";

export function isWhatsAppConfigured(): boolean {
  return !!(PHONE_NUMBER_ID && ACCESS_TOKEN);
}

/**
 * Get the business phone number, checking SystemSettings first,
 * then falling back to env var.
 */
export async function getBusinessPhoneNumber(): Promise<string | null> {
  try {
    const setting = await db.systemSetting.findUnique({
      where: { key: "whatsapp_business_number" },
    });
    if (setting?.value) return setting.value;
  } catch {
    // SystemSetting table might not exist yet
  }
  return process.env.WHATSAPP_BUSINESS_NUMBER || null;
}

/**
 * Log a WhatsApp API call to the database.
 */
async function logWhatsAppMessage(params: {
  phoneNumber: string;
  messageType: string;
  templateName?: string;
  status: string;
  errorMessage?: string;
  requestBody?: string;
  responseBody?: string;
  responseCode?: number;
  durationMs?: number;
}): Promise<void> {
  try {
    await db.whatsAppMessageLog.create({
      data: {
        phoneNumber: params.phoneNumber,
        messageType: params.messageType,
        templateName: params.templateName || null,
        status: params.status,
        errorMessage: params.errorMessage || null,
        requestBody: params.requestBody ? params.requestBody.slice(0, 2000) : null,
        responseBody: params.responseBody ? params.responseBody.slice(0, 2000) : null,
        responseCode: params.responseCode || null,
        durationMs: params.durationMs || null,
      },
    });
  } catch (err) {
    console.error("[WhatsApp] Failed to log message:", err);
  }
}

/**
 * Send a WhatsApp message via Cloud API with full logging.
 */
async function sendWhatsAppMessage(params: {
  phoneNumber: string;
  messageType: string;
  templateName?: string;
  body: Record<string, unknown>;
}): Promise<boolean> {
  if (!isWhatsAppConfigured()) {
    console.warn("[WhatsApp] Not configured — skipping message");
    return false;
  }

  const phone = params.phoneNumber.replace(/[^0-9+]/g, "");
  const phoneE164 = phone.startsWith("+") ? phone.slice(1) : phone;

  if (!phoneE164 || phoneE164.length < 10) {
    console.warn(`[WhatsApp] Invalid phone number: ${params.phoneNumber} — skipping`);
    await logWhatsAppMessage({
      phoneNumber: params.phoneNumber,
      messageType: params.messageType,
      templateName: params.templateName,
      status: "failed",
      errorMessage: "Invalid phone number format",
    });
    return false;
  }

  const requestBody = JSON.stringify({ ...params.body, to: phoneE164 });
  const startTime = Date.now();

  try {
    const response = await fetch(
      `https://graph.facebook.com/${API_VERSION}/${PHONE_NUMBER_ID}/messages`,
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${ACCESS_TOKEN}`,
          "Content-Type": "application/json",
        },
        body: requestBody,
      }
    );

    const durationMs = Date.now() - startTime;
    const responseBody = await response.text();

    if (response.ok) {
      console.log(`📱 WhatsApp ${params.messageType} sent to ${phoneE164}`);
      await logWhatsAppMessage({
        phoneNumber: phoneE164,
        messageType: params.messageType,
        templateName: params.templateName,
        status: "sent",
        requestBody,
        responseBody,
        responseCode: response.status,
        durationMs,
      });
      return true;
    }

    console.error(`[WhatsApp] API error (${response.status}):`, responseBody);
    await logWhatsAppMessage({
      phoneNumber: phoneE164,
      messageType: params.messageType,
      templateName: params.templateName,
      status: "failed",
      errorMessage: `HTTP ${response.status}: ${responseBody.slice(0, 500)}`,
      requestBody,
      responseBody,
      responseCode: response.status,
      durationMs,
    });
    return false;
  } catch (error) {
    const durationMs = Date.now() - startTime;
    const errorMsg = error instanceof Error ? error.message : String(error);
    console.error(`[WhatsApp] Send failed for ${phoneE164}:`, error);
    await logWhatsAppMessage({
      phoneNumber: phoneE164,
      messageType: params.messageType,
      templateName: params.templateName,
      status: "failed",
      errorMessage: errorMsg,
      requestBody,
      durationMs,
    });
    return false;
  }
}

/**
 * Send a WhatsApp OTP message via Cloud API.
 */
export async function sendWhatsAppOtp(phoneNumber: string, otp: string): Promise<boolean> {
  return sendWhatsAppMessage({
    phoneNumber,
    messageType: "otp",
    body: {
      messaging_product: "whatsapp",
      type: "text",
      text: {
        preview_url: false,
        body: `Your Grace Salon verification code is: *${otp}*\n\nThis code expires in 15 minutes. Do not share it with anyone.`,
      },
    },
  });
}

/**
 * Notify a waitlisted user that a slot is available.
 */
export async function sendWhatsAppSlotAvailable(
  phoneNumber: string,
  customerName: string,
  employeeName: string,
  slotTime: string,
  claimMinutes: number
): Promise<boolean> {
  return sendWhatsAppMessage({
    phoneNumber,
    messageType: "slot_available",
    body: {
      messaging_product: "whatsapp",
      type: "text",
      text: {
        preview_url: false,
        body: `🎉 *Slot Available!*\n\nHi ${customerName},\n\nA slot with ${employeeName} at *${slotTime}* just opened up!\n\n⏰ Claim within *${claimMinutes} minutes* or it goes to the next person.\n\nOpen Grace Salon to claim your slot.`,
      },
    },
  });
}

interface WhatsAppBookingData {
  customerName: string;
  customerPhone: string;
  services: string;
  employeeName: string;
  date: string;
  time: string;
  totalPrice: string;
}

/**
 * Send a WhatsApp booking confirmation message via Cloud API.
 */
export async function sendWhatsAppBookingConfirmation(
  data: WhatsAppBookingData
): Promise<boolean> {
  return sendWhatsAppMessage({
    phoneNumber: data.customerPhone,
    messageType: "booking_confirmation",
    templateName: TEMPLATE_NAME,
    body: {
      messaging_product: "whatsapp",
      type: "template",
      template: {
        name: TEMPLATE_NAME,
        language: { code: "en" },
        components: [
          {
            type: "body",
            parameters: [
              { type: "text", text: data.customerName },
              { type: "text", text: data.services },
              { type: "text", text: data.employeeName },
              { type: "text", text: data.date },
              { type: "text", text: data.time },
              { type: "text", text: data.totalPrice },
            ],
          },
        ],
      },
    },
  });
}
