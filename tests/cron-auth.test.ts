import { describe, it, expect, afterEach } from "vitest";
import { GET } from "@/app/api/cron/reminders/route";

/**
 * Regression tests for the cron endpoint's auth check.
 *
 * The old check was \`authHeader !== \`Bearer \${process.env.CRON_SECRET}\`\`,
 * which fails OPEN: an unset CRON_SECRET makes the expected value the literal
 * string "Bearer undefined".
 *
 * The authorized path is deliberately NOT exercised — a correct secret would
 * send real appointment reminders. These tests only cover the rejection paths.
 */

const ORIGINAL = process.env.CRON_SECRET;

afterEach(() => {
  if (ORIGINAL === undefined) delete process.env.CRON_SECRET;
  else process.env.CRON_SECRET = ORIGINAL;
});

function request(headers: Record<string, string> = {}) {
  return new Request("http://localhost/api/cron/reminders", { headers });
}

describe("GET /api/cron/reminders auth", () => {
  it("fails closed when CRON_SECRET is not configured", async () => {
    delete process.env.CRON_SECRET;

    // The exact request the old code would have accepted.
    const asUndefined = await GET(
      request({ authorization: "Bearer undefined" })
    );
    expect(asUndefined.status).toBe(500);

    // And a request with no header at all.
    const bare = await GET(request());
    expect(bare.status).toBe(500);
  });

  it("rejects a missing Authorization header", async () => {
    process.env.CRON_SECRET = "test-secret-value";
    const res = await GET(request());
    expect(res.status).toBe(401);
  });

  it("rejects a wrong secret", async () => {
    process.env.CRON_SECRET = "test-secret-value";
    const res = await GET(
      request({ authorization: "Bearer test-secret-valuf" })
    );
    expect(res.status).toBe(401);
  });

  it("rejects a secret of a different length without throwing", async () => {
    process.env.CRON_SECRET = "test-secret-value";
    const res = await GET(request({ authorization: "Bearer short" }));
    expect(res.status).toBe(401);
  });

  it("rejects the bare token with no Bearer prefix", async () => {
    process.env.CRON_SECRET = "test-secret-value";
    const res = await GET(request({ authorization: "test-secret-value" }));
    expect(res.status).toBe(401);
  });
});
