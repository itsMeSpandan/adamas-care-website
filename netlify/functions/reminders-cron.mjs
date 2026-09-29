/**
 * netlify/functions/reminders-cron.mjs — replaces Vercel Cron (vercel.json)
 * when this app is deployed on Netlify.
 *
 * Schedule: every 10 minutes (UTC), published deploys only (Netlify platform
 * rule — Deploy Previews/staging deploys do not run it).
 *
 * It calls the site's own GET /api/cron/reminders with the CRON_SECRET bearer
 * token. That route owns window selection (24h and ~1h bands) and
 * NotificationLog idempotency, so Vercel Cron and this function share one
 * code path and reminders are sent exactly once per window either way.
 *
 * Platform limits: 30-second execution cap (one internal fetch, well under);
 * cannot be invoked by URL — use "Run now" in the Netlify UI to test.
 *
 * Required env (Netlify → Site settings → Environment variables):
 *   CRON_SECRET  — same value as the app expects
 *   URL          — set automatically by Netlify for published deploys
 */

export default async () => {
  const base = process.env.URL || process.env.DEPLOY_PRIME_URL;
  const secret = process.env.CRON_SECRET;

  if (!secret) {
    console.error(
      "[reminders-cron] CRON_SECRET is not set — skipping run (the route would answer 401 anyway)"
    );
    return;
  }
  if (!base) {
    console.error("[reminders-cron] site URL unavailable — skipping run");
    return;
  }

  try {
    const res = await fetch(`${base}/api/cron/reminders`, {
      headers: { Authorization: `Bearer ${secret}` },
    });
    const body = await res.text();
    console.log(`[reminders-cron] ${res.status} ${body}`);
    if (!res.ok) {
      throw new Error(`reminders route responded ${res.status}`);
    }
  } catch (err) {
    // Surface the failure in the Netlify Functions UI / logs.
    console.error("[reminders-cron] run failed:", err);
    throw err;
  }
};

export const config = {
  schedule: "*/10 * * * *",
};
