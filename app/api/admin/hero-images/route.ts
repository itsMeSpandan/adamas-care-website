import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { requireRole } from "@/lib/require-auth";
import { getSessionFromRequest } from "@/lib/auth";
import { logAudit, getClientIp } from "@/lib/audit";
import { rateLimit, getRateLimitKey } from "@/lib/rate-limit";
import { revalidatePath } from "next/cache";
import sharp from "sharp";
import {
  MAX_HERO_IMAGES,
  HERO_MAX_UPLOAD_BYTES,  HERO_OUTPUT_DESKTOP_WIDTH,
  HERO_OUTPUT_MOBILE_WIDTH,
  getHeroImageStatus,
} from "@/lib/hero-images";

export const dynamic = "force-dynamic";

const uploadLimiter = rateLimit({ windowMs: 60_000, max: 15 }); // 15 uploads / minute

/** Checks actual buffer bytes against magic signatures. Strictly rejects SVG and GIF. */
function detectAllowedImageFormat(buffer: Buffer): "jpeg" | "png" | "webp" | null {
  if (buffer.length < 12) return null;

  // Reject SVG (XML / <svg tags)
  const headAscii = buffer.slice(0, 200).toString("ascii").toLowerCase();
  if (headAscii.includes("<svg") || headAscii.includes("<?xml")) {
    return null;
  }

  // Reject GIF (GIF87a / GIF89a)
  if (
    buffer[0] === 0x47 &&
    buffer[1] === 0x49 &&
    buffer[2] === 0x46 &&
    buffer[3] === 0x38
  ) {
    return null;
  }

  // JPEG (FF D8 FF)
  if (buffer[0] === 0xff && buffer[1] === 0xd8 && buffer[2] === 0xff) {
    return "jpeg";
  }

  // PNG (89 50 4E 47 0D 0A 1A 0A)
  if (
    buffer[0] === 0x89 &&
    buffer[1] === 0x50 &&
    buffer[2] === 0x4e &&
    buffer[3] === 0x47 &&
    buffer[4] === 0x0d &&
    buffer[5] === 0x0a &&
    buffer[6] === 0x1a &&
    buffer[7] === 0x0a
  ) {
    return "png";
  }

  // WebP (RIFF .... WEBP)
  if (
    buffer[0] === 0x52 &&
    buffer[1] === 0x49 &&
    buffer[2] === 0x46 &&
    buffer[3] === 0x46 &&
    buffer[8] === 0x57 &&
    buffer[9] === 0x45 &&
    buffer[10] === 0x42 &&
    buffer[11] === 0x50
  ) {
    return "webp";
  }

  return null;
}

/**
 * GET /api/admin/hero-images
 *
 * Lists all hero images (up to 25) with metadata and status badges.
 * Excludes heavy binary bytes from HeroImageAsset to ensure instant queries.
 */
export const GET = requireRole("admin", async () => {
  const images = await db.heroImage.findMany({
    orderBy: { sortOrder: "asc" },
  });

  const now = new Date();
  const list = images.map((img) => ({
    ...img,
    desktopUrl: `/hero-images/${img.id}/desktop?v=${img.updatedAt.getTime()}`,
    mobileUrl: `/hero-images/${img.id}/mobile?v=${img.updatedAt.getTime()}`,
    status: getHeroImageStatus(img, now),
  }));

  return NextResponse.json({
    images: list,
    count: list.length,
    max: MAX_HERO_IMAGES,
  });
});

/**
 * POST /api/admin/hero-images
 *
 * Upload and process a new hero image.
 * Accepts multipart/form-data.
 * Enforces magic-byte format validation, dimensions, EXIF stripping, WebP conversion,
 * and the 25-image hard cap inside a serialized PostgreSQL advisory lock transaction.
 */
export const POST = requireRole("admin", async (request: Request) => {
  const session = await getSessionFromRequest(request);
  if (!session) {
    return NextResponse.json({ error: "Authentication required" }, { status: 401 });
  }

  // Rate limiting
  const rateKey = getRateLimitKey(request, "hero-upload");
  const rateResult = await uploadLimiter.checkAsync(rateKey);
  if (!rateResult.success) {
    return NextResponse.json(
      { error: "Too many upload attempts. Please wait a minute." },
      { status: 429 }
    );
  }

  let formData: FormData;
  try {
    formData = await request.formData();
  } catch {
    return NextResponse.json({ error: "Invalid form data" }, { status: 400 });
  }

  const file = formData.get("file");
  if (!file || !(file instanceof Blob)) {
    return NextResponse.json({ error: "Please provide an image file" }, { status: 400 });
  }

  if (file.size > HERO_MAX_UPLOAD_BYTES) {
    return NextResponse.json(
      {
        error: `File size is ${(file.size / 1024 / 1024).toFixed(1)} MB. Maximum allowed is 5 MB.`,
      },
      { status: 400 }
    );
  }

  const altRaw = formData.get("alt");
  const alt = typeof altRaw === "string" ? altRaw.trim() : "";
  if (!alt || alt.length < 3) {
    return NextResponse.json(
      { error: "Alt text is required (at least 3 characters describing the image)." },
      { status: 400 }
    );
  }

  const startDateRaw = formData.get("startDate");
  const endDateRaw = formData.get("endDate");
  const startDate = typeof startDateRaw === "string" && startDateRaw.trim() ? startDateRaw.trim() : null;
  const endDate = typeof endDateRaw === "string" && endDateRaw.trim() ? endDateRaw.trim() : null;

  const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;
  if (startDate && !DATE_RE.test(startDate)) {
    return NextResponse.json({ error: "Start date must be in YYYY-MM-DD format" }, { status: 400 });
  }
  if (endDate && !DATE_RE.test(endDate)) {
    return NextResponse.json({ error: "End date must be in YYYY-MM-DD format" }, { status: 400 });
  }
  if (startDate && endDate && endDate < startDate) {
    return NextResponse.json({ error: "End date cannot be before start date" }, { status: 400 });
  }

  const focalXRaw = formData.get("focalX");
  const focalYRaw = formData.get("focalY");
  const focalX = focalXRaw ? Math.max(0, Math.min(100, Number(focalXRaw))) : 50.0;
  const focalY = focalYRaw ? Math.max(0, Math.min(100, Number(focalYRaw))) : 20.0;

  // Convert blob to Buffer
  const arrayBuffer = await file.arrayBuffer();
  const rawBuffer = Buffer.from(arrayBuffer);

  // Magic bytes check
  const detectedFormat = detectAllowedImageFormat(rawBuffer);
  if (!detectedFormat) {
    return NextResponse.json(
      {
        error:
          "Invalid file format. Only JPG, PNG, and WebP images are allowed (SVG and GIF are rejected).",
      },
      { status: 400 }
    );
  }

  // Read dimensions using sharp
  let metadata: { width?: number; height?: number };
  try {
    metadata = await sharp(rawBuffer).metadata();
  } catch {
    return NextResponse.json({ error: "Failed to read image file data" }, { status: 400 });
  }

  if (!metadata.width || !metadata.height) {
    return NextResponse.json({ error: "Could not determine image dimensions" }, { status: 400 });
  }

  const origWidth = metadata.width;
  const origHeight = metadata.height;

  const maxEdge = Math.max(origWidth, origHeight);

  // Downscale input if longest edge > 3000px
  let baseSharp = sharp(rawBuffer).rotate();
  if (maxEdge > 3000) {
    baseSharp =
      origWidth >= origHeight
        ? baseSharp.resize({ width: 3000, withoutEnlargement: true })
        : baseSharp.resize({ height: 3000, withoutEnlargement: true });
  }
  const processedBaseBuffer = await baseSharp.toBuffer();

  // Desktop variant: ~1200px WebP, target <= 250 KB
  const desktopWebp = await sharp(processedBaseBuffer)
    .resize({ width: HERO_OUTPUT_DESKTOP_WIDTH, withoutEnlargement: true })
    .webp({ quality: 80, effort: 4 })
    .toBuffer();

  // Mobile variant: ~800px WebP, target <= 100 KB
  const mobileWebp = await sharp(processedBaseBuffer)
    .resize({ width: HERO_OUTPUT_MOBILE_WIDTH, withoutEnlargement: true })
    .webp({ quality: 75, effort: 4 })
    .toBuffer();

  // Tiny blur placeholder: 16px wide WebP
  const blurBuffer = await sharp(processedBaseBuffer)
    .resize({ width: 16 })
    .webp({ quality: 20 })
    .toBuffer();
  const blurDataUrl = `data:image/webp;base64,${blurBuffer.toString("base64")}`;

  try {
    const createdImage = await db.$transaction(async (tx) => {
      // Advisory transaction lock to prevent race conditions exceeding 25 cap
      await tx.$executeRaw`SELECT pg_advisory_xact_lock(7483921)`;

      const currentCount = await tx.heroImage.count();
      if (currentCount >= MAX_HERO_IMAGES) {
        throw new Error("CAP_REACHED");
      }

      const maxSort = await tx.heroImage.aggregate({ _max: { sortOrder: true } });
      const nextSortOrder = (maxSort._max.sortOrder ?? -1) + 1;

      return await tx.heroImage.create({
        data: {
          alt,
          width: origWidth,
          height: origHeight,
          sortOrder: nextSortOrder,
          enabled: true,
          startDate,
          endDate,
          focalX,
          focalY,
          blurDataUrl,
          createdBy: session.userId,
          asset: {
            create: {
              desktopWebp,
              mobileWebp,
            },
          },
        },
      });
    });

    logAudit({
      action: "hero_image_upload",
      entityType: "hero_image",
      entityId: createdImage.id,
      adminId: session.userId,
      adminName: session.email,
      details: `Uploaded hero image "${alt}" (${origWidth}x${origHeight}px, desktop: ${Math.round(desktopWebp.length / 1024)}KB, mobile: ${Math.round(mobileWebp.length / 1024)}KB)`,
      ip: getClientIp(request),
    });

    revalidatePath("/");
    revalidatePath("/hero-images");

    const now = new Date();
    return NextResponse.json(
      {
        image: {
          ...createdImage,
          desktopUrl: `/hero-images/${createdImage.id}/desktop?v=${createdImage.updatedAt.getTime()}`,
          mobileUrl: `/hero-images/${createdImage.id}/mobile?v=${createdImage.updatedAt.getTime()}`,
          status: getHeroImageStatus(createdImage, now),
        },
        warning:
          origWidth > origHeight
            ? "Landscape image uploaded: it will be cropped to 2:3 portrait on mobile and square/portrait on desktop. Check your focal point setting."
            : null,
      },
      { status: 201 }
    );
  } catch (error) {
    if (error instanceof Error && error.message === "CAP_REACHED") {
      return NextResponse.json(
        {
          error: `Limit of ${MAX_HERO_IMAGES} hero images reached. Delete an existing image before uploading a new one.`,
        },
        { status: 400 }
      );
    }
    console.error("Failed to save hero image:", error);
    return NextResponse.json({ error: "Failed to save the image" }, { status: 500 });
  }
});
