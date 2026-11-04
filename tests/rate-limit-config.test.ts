import { describe, it, expect, vi, afterEach } from "vitest";

/**
 * The rate limiter used to answer every synchronous check() from the
 * in-process limiter even when Upstash was configured — silently disabling the
 * distributed limit — and it degraded to per-instance limiting in production
 * without saying anything. Both are covered here.
 *
 * Modules are re-imported with mock env vars because the limiter reads its
 * configuration at module load / factory call time.
 */

afterEach(() => {
  vi.unstubAllEnvs();
  vi.resetModules();
  vi.restoreAllMocks();
});

async function loadWith(env: Record<string, string>) {
  vi.resetModules();
  for (const [k, v] of Object.entries(env)) vi.stubEnv(k, v);
  const spy = vi.spyOn(console, "error").mockImplementation(() => {});
  const mod = await import("@/lib/rate-limit");
  return { mod, spy };
}

describe("lib/rate-limit", () => {
  it("warns loudly in production when Redis is not configured", async () => {
    const { spy } = await loadWith({
      NODE_ENV: "production",
      UPSTASH_REDIS_REST_URL: "",
      UPSTASH_REDIS_REST_TOKEN: "",
    });

    const logged = spy.mock.calls.flat().join(" ");
    expect(logged).toContain("UPSTASH_REDIS_REST_URL");
    expect(logged).toContain("NOT enforced globally");
  });

  it("stays quiet in production when Redis is configured", async () => {
    const { spy } = await loadWith({
      NODE_ENV: "production",
      UPSTASH_REDIS_REST_URL: "https://example.upstash.io",
      UPSTASH_REDIS_REST_TOKEN: "token",
    });

    expect(spy.mock.calls.flat().join(" ")).not.toContain(
      "NOT enforced globally"
    );
  });

  it("refuses a synchronous check when Redis is configured", async () => {
    const { mod } = await loadWith({
      NODE_ENV: "production",
      UPSTASH_REDIS_REST_URL: "https://example.upstash.io",
      UPSTASH_REDIS_REST_TOKEN: "token",
    });

    const limiter = mod.rateLimit({ windowMs: 60_000, max: 5 });
    expect(() => limiter.check("key")).toThrow(/checkAsync/);
  });

  it("still enforces the in-memory window when Redis is absent", async () => {
    const { mod } = await loadWith({
      NODE_ENV: "development",
      UPSTASH_REDIS_REST_URL: "",
      UPSTASH_REDIS_REST_TOKEN: "",
    });

    const limiter = mod.rateLimit({ windowMs: 60_000, max: 2 });
    expect(limiter.check("unique-key-a").success).toBe(true);
    expect(limiter.check("unique-key-a").success).toBe(true);

    const blocked = limiter.check("unique-key-a");
    expect(blocked.success).toBe(false);
    expect(blocked.retryAfterMs).toBeGreaterThan(0);
  });
});
