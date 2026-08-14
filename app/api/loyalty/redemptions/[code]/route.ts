import { NextResponse } from "next/server";
import { requireAuth } from "@/lib/require-auth";
import { getSessionFromRequest } from "@/lib/auth";
import { getRedemptionByCode } from "@/lib/loyalty";

export const dynamic = "force-dynamic";

export const GET = requireAuth(async (request: Request, context) => {
  const { code } = await context!.params!;
  const session = await getSessionFromRequest(request);
  if (!session) {
    return NextResponse.json({ error: "Authentication required" }, { status: 401 });
  }

  try {
    const redemption = await getRedemptionByCode(code, session.userId);
    if (!redemption) {
      return NextResponse.json({ error: "Invalid, expired, or already used redemption code" }, { status: 404 });
    }

    return NextResponse.json({
      redemption: {
        id: redemption.id,
        code: redemption.code,
        pointsSpent: redemption.pointsSpent,
        expiresAt: redemption.expiresAt,
        createdAt: redemption.createdAt,
      },
      reward: {
        id: redemption.reward.id,
        name: redemption.reward.name,
        discountType: redemption.reward.discountType,
        discountValue: redemption.reward.discountValue,
      },
    });
  } catch (error) {
    console.error("Failed to lookup redemption:", error);
    return NextResponse.json({ error: "Failed to lookup redemption" }, { status: 500 });
  }
});
