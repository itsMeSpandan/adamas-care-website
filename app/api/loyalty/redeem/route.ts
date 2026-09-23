import { NextResponse } from "next/server";
import { requireAuth } from "@/lib/require-auth";
import { getSessionFromRequest } from "@/lib/auth";
import { redeemReward } from "@/lib/loyalty";
import { rateLimit, getRateLimitKey } from "@/lib/rate-limit";

const limiter = rateLimit({ windowMs: 60_000, max: 5 });

export const dynamic = "force-dynamic";

export const POST = requireAuth(async (request: Request) => {
  const key = getRateLimitKey(request, "loyalty-redeem");
  const result = await limiter.checkAsync(key);

  if (!result.success) {
    return NextResponse.json(
      { error: "Too many attempts. Please try again later." },
      { status: 429, headers: { "Retry-After": String(Math.ceil(result.retryAfterMs / 1000)) } }
    );
  }

  const session = await getSessionFromRequest(request);
  if (!session) {
    return NextResponse.json({ error: "Authentication required" }, { status: 401 });
  }

  try {
    const { rewardId } = await request.json();
    if (!rewardId) {
      return NextResponse.json({ error: "rewardId is required" }, { status: 400 });
    }

    const { redemption, reward, newBalance } = await redeemReward(session.userId, rewardId);

    return NextResponse.json({
      redemption: {
        id: redemption.id,
        code: redemption.code,
        pointsSpent: redemption.pointsSpent,
        expiresAt: redemption.expiresAt,
      },
      reward: {
        id: reward.id,
        name: reward.name,
        discountType: reward.discountType,
        discountValue: reward.discountValue,
      },
      newBalance,
    }, { status: 201 });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to redeem reward";
    const status = message.includes("Insufficient") || message.includes("out of stock") ? 400 : 500;
    return NextResponse.json({ error: message }, { status });
  }
});
