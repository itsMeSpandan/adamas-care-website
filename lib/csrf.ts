/**
 * lib/csrf.ts — lightweight CSRF protection for state-changing endpoints.
 *
 * Strategy: validate the Origin header when the client sends one.
 * - Browsers send Origin on every same-origin POST (fetch/form), so web
 *   requests are checked against the request's host.
 * - Non-browser clients (the Flutter app, curl) do not send Origin — those
 *   requests are allowed through, and are protected instead by JWT auth +
 *   rate limiting.
 * - A cross-site form POST carries the attacker's Origin and is rejected.
 *
 * Complements the sameSite=lax session cookies set in lib/auth.ts.
 */

/**
 * Returns true when the request either has no Origin header (non-browser
 * client) or its Origin matches the host we are serving.
 */
export function isSameOrigin(request: Request): boolean {
  const origin = request.headers.get("origin");
  if (!origin) return true; // native clients / curl

  const host =
    request.headers.get("x-forwarded-host") || request.headers.get("host");
  if (!host) return false;

  try {
    return new URL(origin).host === host;
  } catch {
    return false;
  }
}

/** Convenience guard: 403 response when the Origin header is cross-site. */
export function rejectCrossOrigin(request: Request): Response | null {
  if (isSameOrigin(request)) return null;
  return Response.json({ error: "Invalid request origin" }, { status: 403 });
}
