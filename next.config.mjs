/** @type {import('next').NextConfig} */
const nextConfig = {
  poweredByHeader: false,

  async headers() {
    return [
      {
        source: "/(.*)",
        headers: [
          { key: "X-Content-Type-Options", value: "nosniff" },
        ],
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
