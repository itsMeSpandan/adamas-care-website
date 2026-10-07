import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

/**
 * Kept for the HTTPS redirect only.
 *
 * The security headers, CSP and API no-store directive used to live here. They
 * never reached production: Netlify serves middleware.ts as an edge function
 * whose response headers are dropped, so real responses carried only Netlify's
 * own HSTS plus the nosniff header from next.config.mjs. Those headers now live
 * in next.config.mjs `headers()`, which the adapter does honour — do not move
 * them back into this file.
 */
export function middleware(request: NextRequest) {
  // Force HTTPS in production
  if (
    process.env.NODE_ENV === "production" &&
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