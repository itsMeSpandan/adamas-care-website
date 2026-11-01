import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { isHeroImageLive, type PublicHeroImage } from "@/lib/hero-images";

export const dynamic = "force-dynamic";

/**
 * GET /hero-images
 *
 * Public read endpoint that returns ONLY currently LIVE hero images
 * with only the fields the UI needs for rendering.
 */
export async function GET() {
  try {
    const images = await db.heroImage.findMany({
      where: { enabled: true },
      orderBy: { sortOrder: "asc" },
      select: {
        id: true,
        alt: true,
        enabled: true,
        startDate: true,
        endDate: true,
        focalX: true,
        focalY: true,
        blurDataUrl: true,
        updatedAt: true,
      },
    });

    const now = new Date();
    const liveImages: PublicHeroImage[] = images
      .filter((img) => isHeroImageLive(img, now))
      .map((img) => ({
        id: img.id,
        desktopUrl: `/hero-images/${img.id}/desktop?v=${img.updatedAt.getTime()}`,
        mobileUrl: `/hero-images/${img.id}/mobile?v=${img.updatedAt.getTime()}`,
        blurDataUrl: img.blurDataUrl,
        alt: img.alt,
        focalX: img.focalX,
        focalY: img.focalY,
      }));

    return NextResponse.json(
      { images: liveImages },
      {
        status: 200,
        headers: {
          "Cache-Control": "public, max-age=0, s-maxage=60, stale-while-revalidate=30",
        },
      }
    );
  } catch (error) {
    console.error("Failed to fetch live hero images:", error);
    return NextResponse.json({ images: [] }, { status: 500 });
  }
}
