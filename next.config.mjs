/** @type {import('next').NextConfig} */

const isDev = process.env.NODE_ENV === "development";

/**
 * Content-Security-Policy.
 *
 * 'unsafe-inline' for script-src is required by Next.js (hydration,
 * theme-init). 'unsafe-inline' for style-src is required by Tailwind CSS.
 */
const csp = [
  "default-src 'self'",
  // lh3.googleusercontent.com = Google profile photos on User.avatarUrl.
  // flagcdn.com = country flags in the phone country-code dropdown.
  "img-src 'self' https://ui-avatars.com https://maps.googleapis.com https://maps.gstatic.com https://www.gstatic.com https://lh3.googleusercontent.com https://flagcdn.com data: blob:",
  `script-src 'self' 'unsafe-inline'${isDev ? " 'unsafe-eval'" : ""} https://maps.googleapis.com https://www.gstatic.com https://apis.google.com https://accounts.google.com`,
  "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com",
  "font-src 'self' https://fonts.gstatic.com",
  // Firebase Cloud Messaging (web push token registration) + Google sign-in
  // (Firebase Auth popup): token exchange + Google endpoints.
  "connect-src 'self' https://maps.googleapis.com https://maps.gstatic.com https://fcmregistrations.googleapis.com https://firebaseinstallations.googleapis.com https://fcm.googleapis.com https://identitytoolkit.googleapis.com https://securetoken.googleapis.com https://accounts.google.com https://www.googleapis.com https://apis.google.com https://www.google.com",
  // *.firebaseapp.com hosts the Firebase Auth handshake iframe; apis.google.com
  // is loaded by the Google popup helper. Both are required by signInWithPopup.
  "frame-src 'self' https://www.google.com https://maps.google.com https://accounts.google.com https://apis.google.com https://*.firebaseapp.com",
  "frame-ancestors 'none'",
  "base-uri 'self'",
  "form-action 'self'",
].join("; ");

/**
 * Security headers.
 *
 * These live here rather than in middleware.ts on purpose. Netlify serves
 * middleware.ts as an edge function whose response headers never reach the
 * client, so production was sending only Netlify's own HSTS plus the nosniff
 * entry below. next.config's headers() IS honoured by the adapter, so this is
 * the only place the browser actually receives them — do not move them back
 * into middleware.
 */
const securityHeaders = [
  { key: "X-Content-Type-Options", value: "nosniff" },
  { key: "X-Frame-Options", value: "DENY" },
  { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
  {
    key: "Permissions-Policy",
    value: "camera=(), microphone=(), geolocation=(), interest-cohort=()",
  },
  {
    key: "Strict-Transport-Security",
    value: "max-age=63072000; includeSubDomains; preload",
  },
  { key: "Content-Security-Policy", value: csp },
];

/** Never let a proxy or CDN cache an API response. */
const noStoreHeaders = [
  {
    key: "Cache-Control",
    value: "no-store, no-cache, must-revalidate, proxy-revalidate",
  },
  { key: "Pragma", value: "no-cache" },
  { key: "Expires", value: "0" },
];

const nextConfig = {
  poweredByHeader: false,

  async headers() {
    return [
      {
        source: "/(.*)",
        headers: securityHeaders,
      },
      {
        source: "/api/(.*)",
        headers: noStoreHeaders,
      },
    ];
  },

  images: {
    // Exact icon widths/heights used by public/icons/* (see
    // app/manifest.ts + metadata.icons). Without these the optimizer
    // rejects w=192/512/180 with a 400, since they are not in Next's
    // default imageSizes/deviceSizes lists.
    imageSizes: [16, 32, 48, 64, 96, 128, 180, 192, 256, 384, 512],
    remotePatterns: [
      {
        protocol: "https",
        hostname: "ui-avatars.com",
      },
      // Google profile avatars — stored on User.avatarUrl by the Google
      // sign-in flow (decoded.picture), then rendered via next/image.
      {
        protocol: "https",
        hostname: "lh3.googleusercontent.com",
      },
    ],
  },
};

export default nextConfig;
