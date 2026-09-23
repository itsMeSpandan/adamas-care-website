import { NextResponse } from "next/server";
import { verifyToken, signToken } from "@/lib/auth";
import { verifyAndRevokeRefreshToken, createRefreshToken } from "@/lib/refresh-tokens";

export const dynamic = "force-dynamic";

const ACCESS_TOKEN_EXPIRY = "15m";
const REFRESH_COOKIE_NAME = "gracesalon_refresh";
const SESSION_COOKIE_NAME = "gracesalon_session";

/**
 * POST /api/auth/refresh
 *
 * Token rotation flow:
 *   1. Extract old refresh JWT from cookie
 *   2. Verify JWT signature
 *   3. Verify DB record exists & not revoked → revoke it
 *   4. Sign new access + refresh JWTs
 *   5. Store new refresh JWT hash in DB
 *   6. Set both cookies
 *
 * Reuse detection: if a revoked token is presented, all user tokens are revoked.
 */
export async function POST(request: Request) {
  try {
    const cookieHeader = request.headers.get("cookie") || "";
    const match = cookieHeader.match(
      new RegExp(`${REFRESH_COOKIE_NAME}=([^;]+)`)
    );

    if (!match) {
      return NextResponse.json({ error: "No refresh token" }, { status: 401 });
    }

    const oldRefreshToken = match[1];

    // Step 1: Verify JWT signature
    const payload = await verifyToken(oldRefreshToken);
    if (!payload) {
      return clearAndReject("Refresh token expired. Please log in again.");
    }

    // Step 2: Verify in DB + revoke old token (reuse detection)
    try {
      await verifyAndRevokeRefreshToken(payload.userId, oldRefreshToken);
    } catch (err) {
      if (err instanceof Error) {
        if (err.message === "REFRESH_TOKEN_REUSE_DETECTED") {
          console.error(`🚨 Refresh token reuse detected for user ${payload.userId} — all sessions revoked`);
          const resp = clearAndReject("Session compromised. All sessions revoked. Please log in again.");
          resp.cookies.set(SESSION_COOKIE_NAME, "", {
            httpOnly: true,
            secure: process.env.NODE_ENV === "production",
            sameSite: "lax",
            path: "/",
            maxAge: 0,
          });
          return resp;
        }
        return clearAndReject("Invalid refresh token. Please log in again.");
      }
      throw err;
    }

    // Step 3: Sign new access + refresh JWTs
    const sessionPayload = { userId: payload.userId, role: payload.role, email: payload.email };
    const newAccessToken = await signToken(sessionPayload, ACCESS_TOKEN_EXPIRY);
    const newRefreshToken = await signToken(sessionPayload, "7d");

    // Step 4: Store new refresh token hash in DB
    await createRefreshToken(payload.userId, newRefreshToken);

    // Step 5: Set cookies
    const response = NextResponse.json({ ok: true });

    response.cookies.set(SESSION_COOKIE_NAME, newAccessToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      path: "/",
      maxAge: 15 * 60,
    });

    response.cookies.set(REFRESH_COOKIE_NAME, newRefreshToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      path: "/",
      maxAge: 7 * 24 * 60 * 60,
    });

    return response;
  } catch (error) {
    console.error("Token refresh failed:", error);
    return NextResponse.json({ error: "Failed to refresh token" }, { status: 500 });
  }
}

function clearAndReject(message: string) {
  const response = NextResponse.json({ error: message }, { status: 401 });
  response.cookies.set(REFRESH_COOKIE_NAME, "", {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: 0,
  });
  return response;
}
