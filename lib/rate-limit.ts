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
 * Usage:
 *   const limiter = rateLimit({ windowMs: 60_000, max: 5 });
 *   const result = await limiter.checkAsync(key);
 *   if (!result.success) return 429 response.
 *
 * `checkAsync` is REQUIRED whenever Redis is configured. The synchronous
 * `check()` cannot enforce a distributed limit and throws in that case rather
 * than quietly answering from the per-instance fallback.
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

// ─── Configuration guard ───────────────────────────────────────────────────
//
// Without Redis the limiter falls back to an in-process Map. On a serverless
// platform every instance keeps its own counter, so a "10 per minute" login
// limit silently becomes "10 per minute per warm instance" across a whole
// fleet. Say so loudly in production instead of pretending the limit holds.
const hasRedisConfig = Boolean(
  process.env.UPSTASH_REDIS_REST_URL && process.env.UPSTASH_REDIS_REST_TOKEN
);

if (process.env.NODE_ENV === "production" && !hasRedisConfig) {
  console.error(
    "[RateLimit] UPSTASH_REDIS_REST_URL / UPSTASH_REDIS_REST_TOKEN are not set. " +
      "Rate limits are per-instance and therefore NOT enforced globally in " +
      "production. Set both variables in the hosting environment."
  );
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
    /**
     * Synchronous check — only valid when Redis is NOT configured.
     *
     * With Redis in play the authoritative answer needs an async round-trip, so
     * the previous implementation answered from the in-memory limiter instead,
     * silently disabling the distributed limit for anyone who called it. Fail
     * loudly instead: every caller in this codebase should use checkAsync().
     */
    check(key: string): RateLimitResult {
      if (upstash) {
        throw new Error(
          "rateLimit().check() cannot enforce a distributed limit. " +
            "Use `await limiter.checkAsync(key)` instead."
        );
      }

      return inMemoryCheck(key, windowMs, max);
    },

    /**
     * Async variant that uses Upstash when available.
     * Callers that can await should prefer this.
     */
    async checkAsync(key: string): Promise<RateLimitResult> {
      if (upstash) {
        try {
          const windowSeconds = Math.ceil(windowMs / 1000);
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
        } catch (err) {
          console.warn("[RateLimit] Upstash Redis failed, falling back to memory:", err);
          return inMemoryCheck(key, windowMs, max);
        }
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
 * Extract the client IP from proxy headers.
 *
 * Only a header the hosting platform sets and *overwrites* is trustworthy.
 * `x-forwarded-for` and `x-real-ip` are ordinary request headers that a client
 * can send itself, so trusting the FIRST XFF entry let an attacker rotate that
 * header and sidestep every per-IP limit (login brute-force, registration
 * throttle, contact spam).
 *
 * Priority:
 * 1. Platform-set headers (Netlify, Cloudflare) — always overwritten
 * 2. X-Real-IP — set by our own reverse proxy in front of the app
 * 3. LAST X-Forwarded-For entry — the hop appended by the proxy closest to us,
 *    which a client cannot control (the attacker-controlled values are on the
 *    left of the list)
 * 4. "unknown" fallback (local dev with no proxy)
 */
const PLATFORM_IP_HEADERS = [
  "x-nf-client-connection-ip", // Netlify
  "cf-connecting-ip", // Cloudflare
  "x-real-ip", // own reverse proxy
];

export function getTrustedClientIp(request: Request): string {
  for (const header of PLATFORM_IP_HEADERS) {
    const value = request.headers.get(header);
    if (value && value.trim()) return value.trim();
  }

  const forwarded = request.headers.get("x-forwarded-for");
  if (forwarded) {
    const parts = forwarded
      .split(",")
      .map((part) => part.trim())
      .filter(Boolean);
    const lastIp = parts[parts.length - 1];
    if (lastIp) return lastIp;
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
