/**
 * In-memory sliding-window rate limiter for Next.js API routes.
 * 
 * Usage:
 *   const limiter = rateLimit({ windowMs: 60_000, max: 10 });
 *   const result = limiter.check("ip:127.0.0.1");
 *   if (!result.success) return 429 response.
 */

interface RateLimitEntry {
  timestamps: number[];
}

interface RateLimitConfig {
  /** Time window in milliseconds (default: 60_000 = 1 minute) */
  windowMs: number;
  /** Max requests per window (default: 10) */
  max: number;
}

interface RateLimitResult {
  success: boolean;
  remaining: number;
  retryAfterMs: number;
}

const store = new Map<string, RateLimitEntry>();

// Cleanup old entries every 5 minutes to prevent memory leaks
if (typeof setInterval !== "undefined") {
  setInterval(() => {
    const now = Date.now();
    store.forEach((entry, key) => {
      entry.timestamps = entry.timestamps.filter((t: number) => now - t < 300_000);
      if (entry.timestamps.length === 0) store.delete(key);
    });
  }, 300_000);
}

export function rateLimit(config: RateLimitConfig) {
  const { windowMs, max } = config;

  return {
    check(key: string): RateLimitResult {
      const now = Date.now();
      const windowStart = now - windowMs;

      let entry = store.get(key);
      if (!entry) {
        entry = { timestamps: [] };
        store.set(key, entry);
      }

      // Remove timestamps outside the window
      entry.timestamps = entry.timestamps.filter((t: number) => t > windowStart);

      if (entry.timestamps.length >= max) {
        const oldestInWindow = entry.timestamps[0];
        const retryAfterMs = oldestInWindow + windowMs - now;
        return { success: false, remaining: 0, retryAfterMs: Math.ceil(retryAfterMs) };
      }

      entry.timestamps.push(now);
      return { success: true, remaining: max - entry.timestamps.length, retryAfterMs: 0 };
    },
  };
}

/**
 * Helper to extract a rate-limit key from a Request (IP + optional route prefix).
 * Falls back to a header-based approach for serverless/edge environments.
 */
export function getRateLimitKey(request: Request, prefix: string): string {
  const forwarded = request.headers.get("x-forwarded-for");
  const ip = forwarded?.split(",")[0]?.trim() || "unknown";
  return `${prefix}:${ip}`;
}
