/** @type {import('next').NextConfig} */
const nextConfig = {
  // Disable powered-by header for security
  poweredByHeader: false,

  // API-only mode: disable image optimization (not needed)
  images: {
    unoptimized: true,
  },

  async headers() {
    return [
      {
        source: "/:path*",
        headers: [
          { key: "X-Content-Type-Options", value: "nosniff" },
        ],
      },
    ];
  },

  eslint: {
    // Don't fail build on ESLint warnings for API-only mode
    ignoreDuringBuilds: true,
  },
};

export default nextConfig;
