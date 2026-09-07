import { NextResponse } from "next/server";
import { rateLimit, getRateLimitKey } from "@/lib/rate-limit";
import { db } from "@/lib/db";

export const dynamic = "force-dynamic";

const limiter = rateLimit({ windowMs: 300_000, max: 5 }); // 5 per 5 minutes

export async function POST(request: Request) {
  const key = getRateLimitKey(request, "contact");
  const result = limiter.check(key);

  if (!result.success) {
    return NextResponse.json(
      { error: "Too many messages. Please try again later." },
      {
        status: 429,
        headers: {
          "Retry-After": String(Math.ceil(result.retryAfterMs / 1000)),
        },
      }
    );
  }

  try {
    const { name, email, message } = await request.json();

    if (!name || !email || !message) {
      return NextResponse.json(
        { error: "Name, email, and message are required" },
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

    // Sanitize inputs
    const cleanName = String(name).trim().slice(0, 100);
    const cleanEmail = String(email).trim().toLowerCase().slice(0, 254);
    const cleanMessage = String(message).trim().slice(0, 2000);

    // Log the contact submission as an audit event
    // We reuse a lightweight approach: write to AuditLog if available,
    // otherwise just log to console
    try {
      await db.auditLog.create({
        data: {
          action: "contact_form_submit",
          entityType: "contact",
          entityId: "submission",
          adminName: cleanName,
          adminEmail: cleanEmail,
          details: cleanMessage.slice(0, 500),
          ip:
            request.headers.get("x-real-ip") ||
            request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ||
            "unknown",
        },
      });
    } catch {
      // AuditLog table might not exist yet — fall through gracefully
      console.log(`[Contact] ${cleanName} <${cleanEmail}>: ${cleanMessage.slice(0, 200)}`);
    }

    return NextResponse.json(
      { success: true, message: "Message received. We'll be in touch soon!" },
      {
        headers: {
          "X-RateLimit-Limit": "5",
          "X-RateLimit-Remaining": String(result.remaining),
        },
      }
    );
  } catch (error) {
    console.error("Contact form error:", error);
    return NextResponse.json(
      { error: "Failed to process message" },
      { status: 500 }
    );
  }
}
