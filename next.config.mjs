/** @type {import('next').NextConfig} */

const isDev = process.env.NODE_ENV === "development";

/**
 * Security headers.
 *
 * Content-Security-Policy is generated dynamically per request in middleware.ts
 * with a cryptographic nonce (replacing 'unsafe-inline' in script-src) and
 * 'strict-dynamic' for secure Next.js hydration.
 *
 * Static security headers below are applied to all routes.
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
        source: "/api/(.*)",
        headers: noStoreHeaders,
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
