import { NextResponse } from "next/server";
import { db } from "@/lib/db";

export const dynamic = "force-dynamic";

const SETTING_KEY = "dashboard_background";

/**
 * GET /dashboard-background/image
 *
 * The dashboard background bytes. The JSON that describes it lives at
 * /api/dashboard-background; this serves pixels, which is why it is NOT under
 * /api: next.config.mjs sends every /api response with `no-store`, so a
 * Cache-Control here would either be overridden or arrive as a conflicting
 * duplicate and the background would be re-downloaded on every dashboard load.
 *
 * Deliberately unauthenticated: it is a decorative salon image, and the URL is
 * fetched by next/image's optimizer, which runs server-side without the
 * visitor's cookies — requiring a session would 401 every optimized request.
 *
 * Cached hard because clients only ever ask for a versioned URL
 * (`?v=<updatedAt>`), so a replaced image arrives under a new URL. Nothing
 * personalized is served from here.
 */
export async function GET(request: Request) {
  try {
    const setting = await db.systemSetting.findUnique({ where: { key: SETTING_KEY } });
    const value = setting?.value;

    if (!value) {
      return NextResponse.json({ error: "No custom background is set" }, { status: 404 });
    }

    const dataUrl = /^data:(image\/[a-z0-9.+-]+);base64,(.+)$/i.exec(value);

    if (!dataUrl) {
      // An admin may have set a local /path or an https address directly.
      // ValidateImageField bounded it to one of those two forms on the way in.
      if (value.startsWith("/") || value.startsWith("https://")) {
        // Resolve against the incoming request, never a hardcoded host.
        return NextResponse.redirect(new URL(value, request.url).toString(), 307);
      }
      return NextResponse.json({ error: "Stored background is not usable" }, { status: 422 });
    }

    const [, mimeType, base64] = dataUrl;
    const bytes = Buffer.from(base64, "base64");

    return new NextResponse(new Uint8Array(bytes), {
      status: 200,
      headers: {
        "Content-Type": mimeType,
        "Content-Length": String(bytes.length),
        "Cache-Control": "public, max-age=31536000, immutable",
        "X-Content-Type-Options": "nosniff",
      },
    });
  } catch (error) {
    console.error("Failed to serve dashboard background:", error);
    return NextResponse.json({ error: "Failed to load the background" }, { status: 500 });
  }
}
