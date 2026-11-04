/**
 * scripts/mock-resend.ts — local acceptance-test transport for Resend.
 *
 * The sandbox .env has no real RESEND_API_KEY, so the email channel can never
 * succeed and NotificationLog never gets written (rows are only written on
 * channel success). This mock lets the FULL notification pipeline be verified
 * end-to-end locally: notifyBooking → lib/email → Resend SDK → HTTP 201 →
 * NotificationLog row → cron/waitlist idempotency.
 *
 * Usage (dev server only, NEVER in production):
 *   npx tsx scripts/mock-resend.ts            # listens on 127.0.0.1:8099
 *   RESEND_API_KEY=re_local_mock RESEND_BASE_URL=http://127.0.0.1:8099 npm run dev
 *
 * Every POST /emails is appended to scripts/.mock-emails.jsonl as
 * {to, subject, at} for acceptance assertions. Real Resend delivery still
 * requires a human-provided API key (see HUMAN STEPS in progress.md).
 */
import { createServer } from "http";
import { appendFileSync } from "fs";
import { resolve } from "path";

const PORT = Number(process.env.MOCK_RESEND_PORT || 8099);
const LOG = resolve(process.cwd(), "scripts/.mock-emails.jsonl");

const server = createServer((req, res) => {
  let raw = "";
  req.on("data", (c) => (raw += c));
  req.on("end", () => {
    if (req.method === "POST" && (req.url || "").startsWith("/emails")) {
      try {
        const body = JSON.parse(raw || "{}");
        const entry = {
          to: body.to,
          subject: body.subject,
          attachments: (body.attachments || []).map((a: { filename: string }) => a.filename),
          at: new Date().toISOString(),
        };
        appendFileSync(LOG, JSON.stringify(entry) + "\n");
        console.log(`[mock-resend] 201 ${entry.subject} -> ${JSON.stringify(entry.to)}`);
        res.writeHead(201, { "content-type": "application/json" });
        res.end(JSON.stringify({ id: "mock-" + Date.now() })); // Resend success shape
        return;
      } catch (e) {
        res.writeHead(400, { "content-type": "application/json" });
        res.end(JSON.stringify({ message: "invalid mock payload" }));
        return;
      }
    }
    res.writeHead(404, { "content-type": "application/json" });
    res.end(JSON.stringify({ message: "not found" }));
  });
});

server.listen(PORT, "127.0.0.1", () => {
  console.log(`[mock-resend] listening on http://127.0.0.1:${PORT} (log: ${LOG})`);
});
