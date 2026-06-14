import type { MetadataRoute } from "next";
import { BRAND } from "@/lib/brand";

export default function robots(): MetadataRoute.Robots {
  return {
    rules: [
      {
        userAgent: "*",
        allow: "/",
        disallow: [
          "/admin",
          "/api",
          "/employee",
          "/profile",
          "/reset-password",
          "/_next/",
          "/favicon.ico",
        ],
      },
      {
        userAgent: ["GPTBot", "CCBot", "Google-Extended", "anthropic-ai", "Bytespider"],
        disallow: "/",
      },
    ],
    sitemap: `${BRAND.baseUrl}/sitemap.xml`,
  };
}
