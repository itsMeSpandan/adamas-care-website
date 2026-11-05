/** @type {import('next').NextConfig} */

const isDev = process.env.NODE_ENV === "development";

/**
 * Content-Security-Policy.
 *
 * 'unsafe-inline' removed from script-src; uses hashes & 'strict-dynamic'
 * with trusted domains. Dynamic nonces are also attached via middleware.ts.
 */
const csp = [
  "default-src 'self'",
  "img-src 'self' https://ui-avatars.com https://maps.googleapis.com https://maps.gstatic.com https://www.gstatic.com https://lh3.googleusercontent.com https://flagcdn.com https://res.cloudinary.com data: blob:",
  `script-src 'self' 'sha256-Q+8tPsjVtiDsjF/Cv8FMOpg2Yg91oKFKDAJat1PPb2g=' 'strict-dynamic'${isDev ? " 'unsafe-eval'" : ""} https://maps.googleapis.com https://www.gstatic.com https://apis.google.com https://accounts.google.com`,
  "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com",
  "font-src 'self' https://fonts.gstatic.com",
  "connect-src 'self' https://maps.googleapis.com https://maps.gstatic.com https://fcmregistrations.googleapis.com https://firebaseinstallations.googleapis.com https://fcm.googleapis.com https://identitytoolkit.googleapis.com https://securetoken.googleapis.com https://accounts.google.com https://www.googleapis.com https://apis.google.com https://www.google.com https://login.microsoftonline.com https://login.live.com",
  "frame-src 'self' https://www.google.com https://maps.google.com https://accounts.google.com https://apis.google.com https://*.firebaseapp.com https://login.microsoftonline.com https://login.live.com",
  "frame-ancestors 'none'",
  "base-uri 'self'",
  "form-action 'self'",
].join("; ");

/**
 * Security headers applied to all responses.
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

/** 1-year immutable caching for static public media assets. */
const immutableStaticHeaders = [
  {
    key: "Cache-Control",
    value: "public, max-age=31536000, immutable",
  },
];

/** Plain text content-type for security.txt. */
const securityTxtHeaders = [
  {
    key: "Content-Type",
    value: "text/plain; charset=utf-8",
  },
  {
    key: "Cache-Control",
    value: "public, max-age=86400, stale-while-revalidate=604800",
  },
];

const nextConfig = {
  poweredByHeader: false,
  compress: true,
  experimental: {
    serverComponentsExternalPackages: ["@opentelemetry/api", "@opentelemetry/core", "sharp"],
  },

  async headers() {
    return [
      {
        source: "/(.*)",
        headers: securityHeaders,
      },
      {
        source: "/api/((?!services|employees|testimonials|holidays).*)",
        headers: noStoreHeaders,
      },
      {
        source: "/api/:path(services|employees|testimonials|holidays)",
        headers: [
          {
            key: "Cache-Control",
            value: "public, s-maxage=300, stale-while-revalidate=600",
          },
        ],
      },
      {
        source: "/images/(.*)",
        headers: immutableStaticHeaders,
      },
      {
        source: "/icons/(.*)",
        headers: immutableStaticHeaders,
      },
      {
        source: "/.well-known/security.txt",
        headers: securityTxtHeaders,
      },
      {
        source: "/(logo.svg|logo.png|og-image.jpg|favicon.ico)",
        headers: [
          {
            key: "Cache-Control",
            value: "public, max-age=86400, stale-while-revalidate=604800",
          },
        ],
      },
    ];
  },

  images: {
    formats: ["image/avif", "image/webp"],
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
      // Service photos the owner pasted from Unsplash. lib/image-field.ts
      // accepts any https:// address on an image field, so rows can legitimately
      // hold third-party URLs; without this entry the optimizer answers 400
      // ("url parameter is not allowed", a warning in a production build and a
      // thrown render error in dev) and those cards render as empty boxes.
      // Listed host-by-host on purpose: a wildcard would let any https URL —
      // including a member-supplied avatar — make this server fetch an
      // arbitrary address. Add a host here only when real data needs it.
      {
        protocol: "https",
        hostname: "images.unsplash.com",
      },
      {
        protocol: "https",
        hostname: "res.cloudinary.com",
      },
    ],
  },
};

export default nextConfig;
