import { init, send } from "@emailjs/nodejs";

const publicKey = process.env.EMAILJS_PUBLIC_KEY || "";
const privateKey = process.env.EMAILJS_PRIVATE_KEY || "";
const serviceId = process.env.EMAILJS_SERVICE_ID || "";
const otpTemplateId = process.env.EMAILJS_OTP_TEMPLATE_ID || "";

let initialized = false;

function ensureInitialized() {
  if (!initialized && publicKey && privateKey) {
    init({ publicKey, privateKey });
    initialized = true;
  }
}

export function isEmailJsConfigured(): boolean {
  return !!(publicKey && privateKey && serviceId && otpTemplateId);
}

export async function sendOtpEmail(
  toEmail: string,
  userName: string,
  otp: string
): Promise<{ success: boolean; error?: string }> {
  if (!isEmailJsConfigured()) {
    return { success: false, error: "EmailJS is not configured" };
  }

  ensureInitialized();

  try {
    const response = await send(serviceId, otpTemplateId, {
      to_email: toEmail,
      to_name: userName,
      otp,
      app_name: "Grace Salon",
    });

    if (response.status === 200) {
      return { success: true };
    }
    return { success: false, error: `EmailJS error: ${response.text}` };
  } catch (err) {
    console.error("EmailJS send error:", err);
    return {
      success: false,
      error: err instanceof Error ? err.message : "Failed to send OTP email",
    };
  }
}
