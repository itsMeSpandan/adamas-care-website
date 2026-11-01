import { NextResponse } from "next/server";
import { db } from "@/lib/db";

export const dynamic = "force-dynamic";

/**
 * GET /hero-images/[id]/[variant]
 *
 * Serves processed WebP pixels for a hero image (desktop or mobile).
 * Deliberately unauthenticated and placed outside /api so it is cached
 * long-term by Netlify's CDN edge.
 *
 * URLs are versioned with `?v=<updatedAt>` so replacements bust cache automatically.
 */
export async function GET(
  request: Request,
  { params }: { params: { id: string; variant: string } }
) {
  try {
    const { id, variant } = params;
    if (variant !== "desktop" && variant !== "mobile") {
      return NextResponse.json({ error: "Invalid variant" }, { status: 400 });
    }

    const selectField = variant === "desktop" ? { desktopWebp: true } : { mobileWebp: true };

    const asset = await db.heroImageAsset.findUnique({
      where: { heroImageId: id },
      select: selectField,
    });

    if (!asset) {
      return NextResponse.json({ error: "Image asset not found" }, { status: 404 });
    }

    const buffer = variant === "desktop" ? asset.desktopWebp : asset.mobileWebp;
    if (!buffer || buffer.length === 0) {
      return NextResponse.json({ error: "Image data empty" }, { status: 404 });
    }

    return new NextResponse(new Uint8Array(buffer), {
      status: 200,
      headers: {
        "Content-Type": "image/webp",
        "Content-Length": String(buffer.length),
        "Cache-Control": "public, max-age=31536000, immutable",
        "X-Content-Type-Options": "nosniff",
      },
    });
  } catch (error) {
    console.error("Failed to serve hero image asset:", error);
    return NextResponse.json({ error: "Failed to load hero image" }, { status: 500 });
  }
}
