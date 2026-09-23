import { NextResponse } from "next/server";
import { requireAuth } from "@/lib/require-auth";
import { getSessionFromRequest } from "@/lib/auth";
import { revokeAllUserTokens } from "@/lib/refresh-tokens";
import { COOKIE_NAMES } from "@/lib/constants";

export const dynamic = "force-dynamic";

/**
 * POST /api/auth/logout-everywhere
 *
 * Revokes ALL refresh tokens for the authenticated user.
 * Useful for "change password" or "compromised account" flows.
 */
export const POST = requireAuth(async (request: Request) => {
  const session = await getSessionFromRequest(request);
  if (!session) {
    return NextResponse.json({ error: "Authentication required" }, { status: 401 });
  }

  await revokeAllUserTokens(session.userId);

  // Clear local cookies too
  const response = NextResponse.json({ message: "All sessions revoked" });
  response.cookies.set(COOKIE_NAMES.session, "", {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: 0,
  });
  response.cookies.set(COOKIE_NAMES.refresh, "", {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: 0,
  });

  return response;
});
