import { NextResponse } from "next/server";
import { verifyToken, signToken } from "@/lib/auth";

export const dynamic = "force-dynamic";

const ACCESS_TOKEN_EXPIRY = "15m";
const REFRESH_COOKIE_NAME = "gracesalon_refresh";
const SESSION_COOKIE_NAME = "gracesalon_session";

/**
 * POST /api/auth/refresh
 *
 * Reads the httpOnly refresh cookie, verifies it, and issues a fresh
 * access token.  Called by the client when an API returns 401 due to
 * an expired access token.
 */
export async function POST(request: Request) {
  try {
    // Extract refresh token from cookie
    const cookieHeader = request.headers.get("cookie") || "";
    const match = cookieHeader.match(
      new RegExp(`${REFRESH_COOKIE_NAME}=([^;]+)`)
    );

    if (!match) {
      return NextResponse.json(
        { error: "No refresh token" },
        { status: 401 }
      );
    }

    const refreshToken = match[1];
    const payload = await verifyToken(refreshToken);

    if (!payload) {
      // Refresh token expired or invalid — user must re-authenticate
      const response = NextResponse.json(
        { error: "Refresh token expired. Please log in again." },
        { status: 401 }
      );
      // Clear the stale refresh cookie
      response.cookies.set(REFRESH_COOKIE_NAME, "", {
        httpOnly: true,
        secure: process.env.NODE_ENV === "production",
        sameSite: "lax",
        path: "/",
        maxAge: 0,
      });
      return response;
    }

    // Issue a new access token
    const newAccessToken = await signToken(
      { userId: payload.userId, role: payload.role, email: payload.email },
      ACCESS_TOKEN_EXPIRY
    );

    const response = NextResponse.json({ ok: true });

    response.cookies.set(SESSION_COOKIE_NAME, newAccessToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      path: "/",
      maxAge: 15 * 60, // 15 minutes
    });

    return response;
  } catch (error) {
    console.error("Token refresh failed:", error);
    return NextResponse.json(
      { error: "Failed to refresh token" },
      { status: 500 }
    );
  }
}
