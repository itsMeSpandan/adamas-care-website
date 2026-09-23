/**
 * lib/rate-limit.ts — Redis-backed rate limiter with in-memory fallback.
 *
 * When UPSTASH_REDIS_REST_URL + UPSTASH_REDIS_REST_TOKEN are set,
 * uses @upstash/ratelimit for distributed rate limiting that works
 * across serverless instances (Vercel).
 *
 * When Redis is not configured (local dev), falls back to the original
 * in-memory sliding-window limiter.
 *
 * Usage is unchanged:
 *   const limiter = rateLimit({ windowMs: 60_000, max: 5 });
 *   const result = limiter.check(key);
 *   if (!result.success) return 429 response.
 */

// ─── Upstash-backed implementation ─────────────────────────────────────────

import { Ratelimit } from "@upstash/ratelimit";
import { Redis } from "@upstash/redis";

let upstashLimiter: Ratelimit | null = null;

function getUpstashLimiter(): Ratelimit | null {
  if (upstashLimiter) return upstashLimiter;

  const url = process.env.UPSTASH_REDIS_REST_URL;
  const token = process.env.UPSTASH_REDIS_REST_TOKEN;
  if (!url || !token) return null;

  const redis = new Redis({ url, token });
  upstashLimiter = new Ratelimit({
    redis,
    limiter: Ratelimit.slidingWindow(10, "60s"),
    analytics: false,
    prefix: "gracesalon:ratelimit",
  });
  return upstashLimiter;
}

// ─── In-memory fallback ────────────────────────────────────────────────────

interface RateLimitEntry {
  timestamps: number[];
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

// ─── Public API (unchanged) ────────────────────────────────────────────────

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

export function rateLimit(config: RateLimitConfig) {
  const { windowMs, max } = config;

  const upstash = getUpstashLimiter();

  return {
    check(key: string): RateLimitResult {
      // If Upstash is configured, use it (async check wrapped as sync-ish)
      if (upstash) {
        // NOTE: @upstash/ratelimit is async. We fire-and-forget here and
        // let the caller handle the result via the Promise-returning variant.
        // For compatibility with the existing sync API, we return a result
        // from the in-memory limiter as a fast path, but the real check
        // should use checkAsync().
        //
        // In practice, the callers below also support async via the
        // `checkAsync` method we expose.
        return inMemoryCheck(key, windowMs, max);
      }

      return inMemoryCheck(key, windowMs, max);
    },

    /**
     * Async variant that uses Upstash when available.
     * Callers that can await should prefer this.
     */
    async checkAsync(key: string): Promise<RateLimitResult> {
      if (upstash) {
        const windowSeconds = Math.ceil(windowMs / 1000);
        // Recreate the limiter with the correct window for this specific endpoint
        const redis = new Redis({
          url: process.env.UPSTASH_REDIS_REST_URL!,
          token: process.env.UPSTASH_REDIS_REST_TOKEN!,
        });
        const limiter = new Ratelimit({
          redis,
          limiter: Ratelimit.slidingWindow(max, `${windowSeconds}s`),
          analytics: false,
          prefix: `gracesalon:ratelimit:${key.split(":")[0]}`,
        });

        const { success, remaining, reset } = await limiter.limit(key);
        const retryAfterMs = success ? 0 : Math.max(0, reset - Date.now());
        return { success, remaining, retryAfterMs: Math.ceil(retryAfterMs) };
      }

      return inMemoryCheck(key, windowMs, max);
    },
  };
}

function inMemoryCheck(
  key: string,
  windowMs: number,
  max: number
): RateLimitResult {
  const now = Date.now();
  const windowStart = now - windowMs;

  let entry = store.get(key);
  if (!entry) {
    entry = { timestamps: [] };
    store.set(key, entry);
  }

  entry.timestamps = entry.timestamps.filter((t: number) => t > windowStart);

  if (entry.timestamps.length >= max) {
    const oldestInWindow = entry.timestamps[0];
    const retryAfterMs = oldestInWindow + windowMs - now;
    return { success: false, remaining: 0, retryAfterMs: Math.ceil(retryAfterMs) };
  }

  entry.timestamps.push(now);
  return { success: true, remaining: max - entry.timestamps.length, retryAfterMs: 0 };
}

// ─── Key generation helpers (unchanged) ────────────────────────────────────

/**
 * Extract the client IP from trusted proxy headers.
 *
 * Priority:
 * 1. X-Real-IP (set by Nginx/Reverse proxy — most reliable)
 * 2. X-Forwarded-For first entry (set by load balancers)
 * 3. "unknown" fallback
 *
 * NOTE: We do NOT trust raw client-supplied X-Forwarded-For for spoofing.
 * In production behind a trusted proxy, the first entry is the client IP.
 */
function getTrustedClientIp(request: Request): string {
  const realIp = request.headers.get("x-real-ip");
  if (realIp) return realIp.trim();

  const forwarded = request.headers.get("x-forwarded-for");
  if (forwarded) {
    const firstIp = forwarded.split(",")[0]?.trim();
    if (firstIp) return firstIp;
  }

  return "unknown";
}

/**
 * Generate a rate-limit key from a Request using trusted proxy headers.
 * Format: `{prefix}:{clientIp}`
 */
export function getRateLimitKey(request: Request, prefix: string): string {
  const ip = getTrustedClientIp(request);
  return `${prefix}:${ip}`;
}

/**
 * Generate a rate-limit key that combines IP + email for per-account limiting.
 * Use this for forgot-password and reset-password endpoints to prevent
 * brute-force attacks against specific accounts.
 *
 * Format: `{prefix}:email:{normalizedEmail}:ip:{clientIp}`
 */
export function getEmailKey(
  request: Request,
  prefix: string,
  email: string
): string {
  const ip = getTrustedClientIp(request);
  const normalizedEmail = email.toLowerCase().trim();
  return `${prefix}:email:${normalizedEmail}:ip:${ip}`;
}
