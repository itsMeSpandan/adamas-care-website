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

  return NextResponse.next();
}

export const config = {
  matcher: [
    // Match all paths except static files and images
    "/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp|ico)$).*)",
  ],
};
