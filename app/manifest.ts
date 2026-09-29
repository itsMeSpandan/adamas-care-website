import type { MetadataRoute } from "next";
import { BRAND } from "@/lib/brand";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: `${BRAND.name} — Booking & Rewards`,
    short_name: BRAND.name,
    description: `${BRAND.name} — book hair, skin, nail, body, and bridal appointments.`,
    id: "/",
    start_url: "/",
    scope: "/",
    display: "standalone",
    orientation: "portrait",
    background_color: "#F5F1EA", // beige-50
    theme_color: "#F5F1EA",
    lang: "en_IN",
    categories: ["beauty", "lifestyle"],
    icons: [
      { src: "/icons/icon-192.png", sizes: "192x192", type: "image/png" },
      { src: "/icons/icon-512.png", sizes: "512x512", type: "image/png" },
      {
        src: "/icons/icon-maskable-512.png",
        sizes: "512x512",
        type: "image/png",
        purpose: "maskable",
      },
    ],
  };
}
