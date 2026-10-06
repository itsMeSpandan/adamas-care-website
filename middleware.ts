import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

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

  const response = NextResponse.next();

  // Security headers
  response.headers.set("X-Frame-Options", "DENY");
  response.headers.set(    "X-Content-Type-Options", "nosniff");
  response.headers.set("Referrer-Policy", "strict-origin-when-cross-origin");
  response.headers.set(
    "Permissions-Policy",
    "camera=(), microphone=(), geolocation=(), interest-cohort=()"
  );
  response.headers.set(
    "Strict-Transport-Security",
    "max-age=63072000; includeSubDomains; preload"
  );

  // Content-Security-Policy
  // 'unsafe-inline' for script-src is required by Next.js (hydration, theme-init).
  // 'unsafe-inline' for style-src is required by Tailwind CSS.
  const isDev = process.env.NODE_ENV === "development";

  const csp = [
    "default-src 'self'",
    // lh3.googleusercontent.com = Google profile photos on User.avatarUrl.
    // flagcdn.com = country flags in the phone country-code dropdown.
    "img-src 'self' https://ui-avatars.com https://maps.googleapis.com https://maps.gstatic.com https://www.gstatic.com https://lh3.googleusercontent.com https://flagcdn.com data: blob:",
    `script-src 'self' 'unsafe-inline'${isDev ? " 'unsafe-eval'" : ""} https://maps.googleapis.com https://www.gstatic.com https://apis.google.com https://accounts.google.com`,
    "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com",
    "font-src 'self' https://fonts.gstatic.com",
    // Firebase Cloud Messaging (web push token registration) — added for the
    // notification system; no WhatsApp/graph.facebook domains ever existed here.
    // Google sign-in (Firebase Auth popup): token exchange + Google endpoints.
    "connect-src 'self' https://maps.googleapis.com https://maps.gstatic.com https://fcmregistrations.googleapis.com https://firebaseinstallations.googleapis.com https://fcm.googleapis.com https://identitytoolkit.googleapis.com https://securetoken.googleapis.com https://accounts.google.com https://www.googleapis.com https://apis.google.com https://www.google.com",
    // *.firebaseapp.com hosts the Firebase Auth handshake iframe; apis.google.com
    // is loaded by the Google popup helper. Both are required by signInWithPopup.
    "frame-src 'self' https://www.google.com https://maps.google.com https://accounts.google.com https://apis.google.com https://*.firebaseapp.com",
    "frame-ancestors 'none'",
    "base-uri 'self'",
    "form-action 'self'",
  ].join("; ");

  response.headers.set("Content-Security-Policy", csp);

  // Prevent caching of API responses
  if (request.nextUrl.pathname.startsWith("/api")) {
    response.headers.set(
      "Cache-Control",
      "no-store, no-cache, must-revalidate, proxy-revalidate"
    );
    response.headers.set("Pragma", "no-cache");
    response.headers.set("Expires", "0");
  }

  return response;
}

export const config = {
  matcher: [
    // Match all paths except static files and images
    "/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp|ico)$).*)",
  ],
};