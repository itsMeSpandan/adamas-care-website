import { NextResponse } from "next/server";
import { timingSafeEqual } from "node:crypto";

/**
 * lib/cron-auth.ts — the shared auth check for cron-triggered endpoints.
 *
 * Constant-time string comparison. A plain `!==` leaks how many leading
 * characters of the secret were guessed via response timing.
 */
function safeEqual(a: string, b: string): boolean {
  const bufA = Buffer.from(a, "utf8");
  const bufB = Buffer.from(b, "utf8");
  if (bufA.length !== bufB.length) return false;
  return timingSafeEqual(bufA, bufB);
}

/**
 * Verify `Authorization: Bearer <CRON_SECRET>` on a cron endpoint.
 *
 * Returns a response to short-circuit with, or null when the caller may run.
 *
 * This must fail CLOSED. The original inline check interpolated the env var
 * directly, so an unset CRON_SECRET turned the expected value into the literal
 * string "Bearer undefined" — anyone who guessed it could fire the job. Refuse
 * to run at all when the secret is missing.
 */
export function requireCronAuth(request: Request): NextResponse | null {
  const cronSecret = process.env.CRON_SECRET;
  if (!cronSecret) {
    console.error("[cron] CRON_SECRET is not configured — refusing to run.");
    return NextResponse.json(
      { error: "Server is not configured" },
      { status: 500 }
    );
  }

  const authHeader = request.headers.get("authorization") ?? "";
  if (!safeEqual(authHeader, `Bearer ${cronSecret}`)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  return null;
}
