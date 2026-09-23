import { NextResponse } from "next/server";
import { clearSessionCookies } from "@/lib/auth";

export const dynamic = "force-dynamic";

const REFRESH_COOKIE_NAME = "gracesalon_refresh";

export async function POST(request: Request) {
  // Extract the refresh token before clearing cookies so we can revoke it server-side
  const cookieHeader = request.headers.get("cookie") || "";
  const match = cookieHeader.match(new RegExp(`${REFRESH_COOKIE_NAME}=([^;]+)`));
  const refreshToken = match?.[1];

  // Revoke server-side + clear cookies
  await clearSessionCookies(refreshToken || undefined);

  return NextResponse.json({ message: "Logged out successfully" });
}
