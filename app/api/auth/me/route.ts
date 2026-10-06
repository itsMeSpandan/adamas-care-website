import { NextResponse } from "next/server";
import { getSessionFromRequest } from "@/lib/auth";
import { db } from "@/lib/db";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  const session = await getSessionFromRequest(request);
  if (!session) {
    // Tell the client whether a refresh cookie was even sent, so an
    // anonymous visitor never fires a doomed POST /api/auth/refresh.
    const cookieHeader = request.headers.get("cookie") || "";
    const canRefresh = /(?:^|;\s*)gracesalon_refresh=[^;]+/.test(cookieHeader);
    return NextResponse.json({ user: null, canRefresh });
  }

  try {
    const user = await db.user.findUnique({
      where: { id: session.userId },
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
        gender: true,
        avatarUrl: true,
        employeeId: true,
        loyaltyPoints: true,
        mustChangePassword: true,
        whatsappNumber: true,
        createdAt: true,
      },
    });

    if (!user) {
      return NextResponse.json({ user: null });
    }

    return NextResponse.json({ user });
  } catch (error) {
    console.error("Session check failed:", error);
    return NextResponse.json({ user: null });
  }
}
