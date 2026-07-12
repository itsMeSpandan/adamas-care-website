/**
 * In-memory sliding-window rate limiter for Next.js API routes.
 * 
 * Stage 3.1 improvements:
 * - Uses trusted proxy headers (X-Real-IP, then X-Forwarded-For) instead of raw client IP
 * - Supports per-email limiting via `getEmailKey()` helper
 * 
 * Usage:
 *   const limiter = rateLimit({ windowMs: 60_000, max: 10 });
 *   const result = limiter.check("ip:127.0.0.1");
 *   if (!result.success) return 429 response.
 * 
 * For per-email limiting (forgot-password, reset-password):
 *   const emailKey = getEmailKey(request, "forgot-password", email);
 *   const result = limiter.check(emailKey);
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
  // X-Real-IP is typically set by Nginx/reverse proxy and is the most reliable
  const realIp = request.headers.get("x-real-ip");
  if (realIp) return realIp.trim();

  // X-Forwarded-For: first entry is the original client (behind trusted proxy)
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
