/**
 * scripts/test-whatsapp.ts — verify the WhatsApp Cloud API setup end-to-end.
 *
 * Usage:
 *   RECIPIENT=+919876543210 npx tsx scripts/test-whatsapp.ts
 *
 * Recipient can also come from WHATSAPP_TEST_RECIPIENT in .env.
 * The recipient number must have joined the test number's allow-list
 * (Meta dashboard → WhatsApp → API Setup → "To" number).
 *
 * Sends a plain text message (no pre-approved template needed) and prints
 * the full API response so credential / version / allow-list errors are obvious.
 */

import { readFileSync } from "fs";
import { resolve } from "path";

// tsx doesn't auto-load .env — parse it manually (same file Next.js loads).
function loadEnv(): void {
  try {
    const raw = readFileSync(resolve(process.cwd(), ".env"), "utf8");
    for (const line of raw.split("\n")) {
      const match = line.match(/^\s*([A-Za-z_][A-Za-z0-9_]*)\s*=\s*(.*)\s*$/);
      if (!match) continue;
      const key = match[1];
      let value = match[2].trim();
      if (value.startsWith('"') && value.endsWith('"')) value = value.slice(1, -1);
      if (value.startsWith("'") && value.endsWith("'")) value = value.slice(1, -1);
      if (process.env[key] === undefined) process.env[key] = value;
    }
  } catch {
    console.error("⚠️  Could not read .env — relying on process env only");
  }
}

loadEnv();

const PHONE_NUMBER_ID = process.env.WHATSAPP_PHONE_NUMBER_ID;
const ACCESS_TOKEN = process.env.WHATSAPP_ACCESS_TOKEN;
const API_VERSION = process.env.WHATSAPP_API_VERSION || "v25.0";
const RECIPIENT = (
  process.env.RECIPIENT ||
  process.env.WHATSAPP_TEST_RECIPIENT ||
  ""
).replace(/[^0-9]/g, "");

function maskSecret(value: string | undefined, visible = 6): string {
  if (!value) return "(not set)";
  if (value.length <= visible) return "***";
  return `${value.slice(0, visible)}…${value.slice(-4)} (${value.length} chars)`;
}

async function main(): Promise<void> {
  console.log("── WhatsApp Cloud API setup check ──────────────────────");
  console.log(`PHONE_NUMBER_ID : ${maskSecret(PHONE_NUMBER_ID)}`);
  console.log(`ACCESS_TOKEN    : ${maskSecret(ACCESS_TOKEN)}`);
  console.log(`API_VERSION     : ${API_VERSION}`);
  console.log(`RECIPIENT       : ${RECIPIENT || "(not set)"}`);

  if (!PHONE_NUMBER_ID || !ACCESS_TOKEN) {
    console.error("\n❌ Missing WHATSAPP_PHONE_NUMBER_ID or WHATSAPP_ACCESS_TOKEN in .env");
    process.exitCode = 1;
    return;
  }
  if (!RECIPIENT || RECIPIENT.length < 10) {
    console.error(
      "\n❌ No recipient. Run with: RECIPIENT=+919876543210 npx tsx scripts/test-whatsapp.ts"
    );
    process.exitCode = 1;
    return;
  }

  const body = {
    messaging_product: "whatsapp",
    to: RECIPIENT,
    type: "text",
    text: { preview_url: false, body: "✅ Grace Salon WhatsApp API is live!" },
  };

  const url = `https://graph.facebook.com/${API_VERSION}/${PHONE_NUMBER_ID}/messages`;
  console.log(`\n→ POST ${url}`);

  const response = await fetch(url, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${ACCESS_TOKEN}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(body),
  });

  const responseBody = await response.text();

  if (response.ok) {
    const json = JSON.parse(responseBody) as {
      messages?: { id: string }[];
    };
    console.log("\n✅ Message sent!");
    console.log(`   Message ID: ${json.messages?.[0]?.id ?? "(unknown)"}`);
    console.log("   Check the recipient's WhatsApp for the message.");
  }

  // Common failure codes → actionable hints
  const hints: Record<string, string> = {
    "133010": "Account not registered yet — the test number is still provisioning (status=PENDING). Finish the 'Send a message from your test number' step in the Meta dashboard, wait a few minutes, and retry.",
    "131030": "Recipient not in the test allow-list. Add them under Meta → WhatsApp → API Setup → 'To'.",
    "131047": "Re-engagement required: 24h window closed. Recipient must message you first (test numbers only).",
    "132000": "Template param count mismatch — check the template's placeholders.",
    "190": "Access token invalid or expired. Generate a new one in the Meta dashboard.",
    "100": "Bad parameter — verify PHONE_NUMBER_ID and API version.",
    "10": "Permission denied — token lacks whatsapp_business_messaging.",
  };

  let hint = "";
  try {
    const err = JSON.parse(responseBody) as {
      error?: { code?: number; error_subcode?: number; message?: string };
    };
    const code = String(err.error?.code ?? "");
    const sub = String(err.error?.error_subcode ?? "");
    hint = hints[code] || hints[sub] || "";
  } catch {
    /* non-JSON error body */
  }

  console.error(`\n❌ Send failed — HTTP ${response.status}`);
  console.error(`   Response: ${responseBody.slice(0, 800)}`);
  if (hint) console.error(`   Hint: ${hint}`);
  process.exitCode = 1;
}

main().catch((err) => {
  console.error("❌ Unexpected error:", err);
  process.exitCode = 1;
});
