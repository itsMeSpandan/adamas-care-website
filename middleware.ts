import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { jwtVerify } from "jose";
import { COOKIE_NAMES } from "@/lib/constants";

/**
 * middleware.ts
 *
 * Two jobs:
 *
 * 1. Keep the /admin and /employee HTML shells from being served to anonymous
 *    visitors. Those portals guard themselves in RoleLayout with a useEffect,
 *    which only runs *after* the page has already rendered — so the full
 *    admin/employee markup was sent to anyone who asked. The APIs were always
 *    protected (requireRole), so this was shell exposure rather than data
 *    leakage; checking here closes it before a byte of the shell is streamed.
 *
 * 2. Force HTTPS in production (see the header note below about headers).
 *
 * The security headers, CSP and API no-store directive used to live here. They
 * never reached production: Netlify serves middleware.ts as an edge function
 * whose response headers are dropped, so real responses carried only Netlify's
 * own HSTS plus the nosniff header from next.config.mjs. Those headers now live
 * in next.config.mjs `headers()`, which the adapter does honour — do not move
 * them back into this file.
 */

const SESSION_SECRET = process.env.SESSION_SECRET;
const SECRET_KEY = SESSION_SECRET ? new TextEncoder().encode(SESSION_SECRET) : null;

/** Hosts that are always served over http in development. */
const LOOPBACK_HOST = /^(localhost|127(?:\.\d{1,3}){3}|\[::1\]|::1)(?::\d+)?$/i;

interface PortalSession {
  role?: string;
}

/**
 * Read the session from the access cookie, falling back to the refresh cookie.
 *
 * The access token lives only 15 minutes while the refresh token lasts 7 days,
 * and the client silently refreshes the former on mount. Rejecting a request
 * merely because the access token has aged out would bounce a legitimately
 * signed-in admin to the home page before that refresh could run, so a valid
 * refresh token also counts as a session here. Both are signed with the same
 * secret and the same payload. This is a shell guard only — the API still
 * requires a live access token.
 */
async function readPortalSession(request: NextRequest): Promise<PortalSession | null> {
  if (!SECRET_KEY) return null;

  for (const name of [COOKIE_NAMES.session, COOKIE_NAMES.refresh]) {
    const token = request.cookies.get(name)?.value;
    if (!token) continue;
    try {
      const { payload } = await jwtVerify(token, SECRET_KEY);
      return payload as PortalSession;
    } catch {
      // expired or malformed — try the next cookie
    }
  }
  return null;
}

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  const isAdminArea = pathname === "/admin" || pathname.startsWith("/admin/");
  const isEmployeeArea =
    pathname === "/employee" || pathname.startsWith("/employee/");
  const isBookingArea =
    pathname === "/booking" || pathname.startsWith("/booking/");

  // ─── Booking guard ───────────────────────────────────────────────────────
  // Unauthenticated visitors are redirected to the sign-in page with their
  // intended destination preserved in the redirect query parameter.
  if (isBookingArea) {
    if (SECRET_KEY) {
      const session = await readPortalSession(request);
      if (!session) {
        const loginUrl = request.nextUrl.clone();
        loginUrl.pathname = "/login";
        const redirectTarget = pathname + (request.nextUrl.search || "");
        loginUrl.search = `?redirect=${encodeURIComponent(redirectTarget)}`;
        return NextResponse.redirect(loginUrl);
      }
    }
  }

  // ─── Portal guard ────────────────────────────────────────────────────────
  if (isAdminArea || isEmployeeArea) {
    // Without a signing secret nothing can authenticate; fail open here so a
    // misconfigured deployment is not locked out of its own admin portal.
    // lib/auth.ts already refuses to boot the app in that state.
    if (SECRET_KEY) {
      const session = await readPortalSession(request);
      const requiresAdmin = isAdminArea;
      const allowed =
        !!session &&
        (session.role === "admin" ||
          (!requiresAdmin && session.role === "employee"));

      if (!allowed) {
        const home = request.nextUrl.clone();
        home.pathname = "/";
        home.search = "";
        return NextResponse.redirect(home);
      }
    }
  }

  // ─── Force HTTPS in production ───────────────────────────────────────────
  // Skip loopback hosts: a plain `next start` locally has no proxy to set
  // x-forwarded-proto, so the old check redirected every request on
  // http://localhost to https://localhost — an address nothing is listening on.
  const host = request.headers.get("host") ?? "";
  if (
    process.env.NODE_ENV === "production" &&
    !LOOPBACK_HOST.test(host) &&
    request.headers.get("x-forwarded-proto") !== "https"
  ) {
    const httpsUrl = request.nextUrl.clone();
    httpsUrl.protocol = "https";
    return NextResponse.redirect(httpsUrl);
  }

  // ─── Content-Security-Policy ──────────────────────────────────────────
  const cspHeader = [
    "default-src 'self'",
    "img-src 'self' https://ui-avatars.com https://maps.googleapis.com https://maps.gstatic.com https://www.gstatic.com https://lh3.googleusercontent.com https://flagcdn.com https://res.cloudinary.com data: blob:",
    "script-src 'self' 'unsafe-inline' 'unsafe-eval' https://maps.googleapis.com https://www.gstatic.com https://apis.google.com https://accounts.google.com",
    "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com",
    "font-src 'self' https://fonts.gstatic.com",
    "connect-src 'self' https://maps.googleapis.com https://maps.gstatic.com https://fcmregistrations.googleapis.com https://firebaseinstallations.googleapis.com https://fcm.googleapis.com https://identitytoolkit.googleapis.com https://securetoken.googleapis.com https://accounts.google.com https://www.googleapis.com https://apis.google.com https://www.google.com https://login.microsoftonline.com https://login.live.com",
    "frame-src 'self' https://www.google.com https://maps.google.com https://accounts.google.com https://apis.google.com https://*.firebaseapp.com https://login.microsoftonline.com https://login.live.com",
    "frame-ancestors 'none'",
    "base-uri 'self'",
    "form-action 'self'",
  ].join("; ");

  const requestHeaders = new Headers(request.headers);
  requestHeaders.set("Content-Security-Policy", cspHeader);

  const response = NextResponse.next({
    request: {
      headers: requestHeaders,
    },
  });
  response.headers.set("Content-Security-Policy", cspHeader);

  return response;
}

export const config = {
  matcher: [
    // Match all paths except static files and images.
    //
    // Also excluded, because none of these need this middleware and all of them
    // must be served as a clean 200 with no redirect:
    //   .well-known/            — Digital Asset Links for the Android TWA. A
    //                             redirect chain here silently breaks TWA link
    //                             handling, and every request would otherwise
    //                             pay an edge invocation for nothing.
    //   manifest.webmanifest    — PWA manifest
    //   sw.js                   — service worker
    //   firebase-messaging-sw.js — push worker, imported by sw.js
    //   offline.html            — precached offline fallback
    "/((?!_next/static|_next/image|favicon.ico|\\.well-known/|manifest\\.webmanifest|firebase-messaging-sw\\.js|sw\\.js|offline\\.html|.*\\.(?:svg|png|jpg|jpeg|gif|webp|ico)$).*)",
  ],
};
