/**
 * lib/loyalty.ts — Core loyalty points logic.
 *
 * All point math happens server-side. Never trust client input for points.
 * Uses prisma.$transaction for atomic operations to prevent race conditions.
 */

import { db } from "@/lib/db";
import type { PrismaClient } from "@prisma/client";
import {
  LOYALTY_POINTS_PER_CURRENCY_UNIT,
  LOYALTY_MAX_BALANCE,
  LOYALTY_REDEMPTION_CODE_LENGTH,
  LOYALTY_REDEMPTION_EXPIRY_DAYS,
} from "@/lib/constants";
import crypto from "crypto";

// ─── Points Calculation ────────────────────────────────────────────────────────

/**
 * Compute loyalty points earned from a booking price.
 * Server-computed only — never accept client-supplied price.
 */
export function computePointsEarned(price: number): number {
  return Math.floor(price * LOYALTY_POINTS_PER_CURRENCY_UNIT);
}

// ─── Award Points ──────────────────────────────────────────────────────────────

/**
 * Award loyalty points when a booking is completed.
 * Idempotent: skips if a transaction already exists for this bookingId.
 * Runs inside a Prisma interactive transaction for atomicity.
 *
 * @returns The loyalty transaction created, or null if skipped.
 */
type TxClient = PrismaClient | Parameters<Parameters<PrismaClient["$transaction"]>[0]>[0];

export async function awardPointsForBooking(bookingId: string, tx?: TxClient) {
  const client = tx || db;

  // Check if already awarded (idempotency guard)
  const existing = await client.loyaltyTransaction.findFirst({
    where: { bookingId, type: "earn" },
  });
  if (existing) return null;

  const booking = await client.booking.findUnique({ where: { id: bookingId } });
  if (!booking || !booking.userId || booking.status !== "completed") return null;

  const points = computePointsEarned(booking.price);
  if (points <= 0) return null;

  // Use provided transaction client, or wrap in our own
  const run = async (t: TxClient) => {
    // Check current balance BEFORE incrementing to enforce max cap
    const user = await t.user.findUnique({
      where: { id: booking.userId! },
      select: { loyaltyPoints: true },
    });
    if (!user) return null;

    // Enforce max balance cap
    if (user.loyaltyPoints >= LOYALTY_MAX_BALANCE) {
      console.warn(`[loyalty] User ${booking.userId} hit max balance (${LOYALTY_MAX_BALANCE}), skipping ${points} points`);
      return null;
    }

    const cappedPoints = Math.min(points, LOYALTY_MAX_BALANCE - user.loyaltyPoints);

    const updated = await t.user.update({
      where: { id: booking.userId! },
      data: { loyaltyPoints: { increment: cappedPoints } },
      select: { loyaltyPoints: true },
    });

    return t.loyaltyTransaction.create({
      data: {
        userId: booking.userId!,
        type: "earn",
        points: cappedPoints,
        balanceAfter: updated.loyaltyPoints,
        bookingId,
        note: `Earned ${cappedPoints} points from booking (price: ${booking.price})`,
      },
    });
  };

  return tx ? run(tx) : db.$transaction(run);
}

/**
 * Clawback loyalty points when a completed booking is cancelled.
 * Clamps balance at 0 — never goes negative.
 * Idempotent: skips if no earn transaction exists or already clawed back.
 */
export async function clawbackPointsForBooking(bookingId: string, tx?: TxClient) {
  const client = tx || db;

  // Find the original earn transaction
  const earnTx = await client.loyaltyTransaction.findFirst({
    where: { bookingId, type: "earn" },
  });
  if (!earnTx) return null;

  // Check if already clawed back
  const alreadyClawed = await client.loyaltyTransaction.findFirst({
    where: { bookingId, type: "refund_reversal" },
  });
  if (alreadyClawed) return null;

  const run = async (t: TxClient) => {
    const user = await t.user.findUnique({ where: { id: earnTx.userId } });
    if (!user) return null;

    // Clamp: don't let balance go negative
    const deduction = Math.min(earnTx.points, user.loyaltyPoints);
    if (deduction <= 0) return null;

    if (deduction < earnTx.points) {
      console.warn(`[loyalty] Clawback clamped: requested ${earnTx.points}, only ${deduction} available (user: ${earnTx.userId})`);
    }

    const updated = await t.user.update({
      where: { id: earnTx.userId },
      data: { loyaltyPoints: { decrement: deduction } },
      select: { loyaltyPoints: true },
    });

    return t.loyaltyTransaction.create({
      data: {
        userId: earnTx.userId,
        type: "refund_reversal",
        points: -deduction,
        balanceAfter: updated.loyaltyPoints,
        bookingId,
        note: deduction < earnTx.points
          ? `Clawback clamped: ${deduction}/${earnTx.points} points (balance was ${user.loyaltyPoints})`
          : `Clawback of ${deduction} points for cancelled booking`,
      },
    });
  };

  return tx ? run(tx) : db.$transaction(run);
}

// ─── Manual Adjustment (Admin) ─────────────────────────────────────────────────

/**
 * Admin-only manual point adjustment.
 * @param points — positive to add, negative to deduct
 */
export async function adjustPoints(
  userId: string,
  points: number,
  note: string
) {
  if (!note || note.trim().length < 3) {
    throw new Error("Adjustment note is required (min 3 characters)");
  }

  return db.$transaction(async (tx) => {
    const user = await tx.user.findUnique({ where: { id: userId } });
    if (!user) throw new Error("User not found");

    const newBalance = Math.max(0, user.loyaltyPoints + points);
    const actualDelta = newBalance - user.loyaltyPoints;

    if (actualDelta === 0) return null;

    const updated = await tx.user.update({
      where: { id: userId },
      data: { loyaltyPoints: newBalance },
      select: { loyaltyPoints: true },
    });

    return tx.loyaltyTransaction.create({
      data: {
        userId,
        type: "adjust",
        points: actualDelta,
        balanceAfter: updated.loyaltyPoints,
        note: note.trim(),
      },
    });
  });
}

// ─── Redemption ────────────────────────────────────────────────────────────────

/** Generate a short alphanumeric redemption code. */
function generateRedemptionCode(): string {
  const chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789"; // no I/O/0/1 to avoid confusion
  let code = "";
  const bytes = crypto.randomBytes(LOYALTY_REDEMPTION_CODE_LENGTH);
  for (let i = 0; i < LOYALTY_REDEMPTION_CODE_LENGTH; i++) {
    code += chars[bytes[i] % chars.length];
  }
  return code;
}

/**
 * Redeem a loyalty reward for the current user.
 * Race-condition-safe: uses conditional DB update (WHERE stock > 0).
 * All operations in a single transaction.
 */
export async function redeemReward(userId: string, rewardId: string) {
  return db.$transaction(async (tx) => {
    // 1. Fetch reward with lock
    const reward = await tx.loyaltyReward.findUnique({ where: { id: rewardId } });
    if (!reward || !reward.isActive) {
      throw new Error("Reward not found or inactive");
    }

    // 2. Check stock (if limited)
    if (reward.stock !== null && reward.stock <= 0) {
      throw new Error("Reward is out of stock");
    }

    // 3. Check user balance
    const user = await tx.user.findUnique({ where: { id: userId } });
    if (!user) throw new Error("User not found");
    if (user.loyaltyPoints < reward.pointsCost) {
      throw new Error(`Insufficient points. You have ${user.loyaltyPoints}, need ${reward.pointsCost}`);
    }

    // 4. Deduct stock atomically (conditional update — prevents race condition)
    if (reward.stock !== null) {
      const updated = await tx.loyaltyReward.updateMany({
        where: { id: rewardId, stock: { gt: 0 } },
        data: { stock: { decrement: 1 } },
      });
      if (updated.count === 0) {
        throw new Error("Reward went out of stock (concurrent request)");
      }
    }

    // 5. Deduct points from user
    const updatedUser = await tx.user.update({
      where: { id: userId },
      data: { loyaltyPoints: { decrement: reward.pointsCost } },
      select: { loyaltyPoints: true },
    });

    // 6. Create redemption record
    const code = generateRedemptionCode();
    const expiresAt = LOYALTY_REDEMPTION_EXPIRY_DAYS
      ? new Date(Date.now() + LOYALTY_REDEMPTION_EXPIRY_DAYS * 24 * 60 * 60 * 1000)
      : null;
    const redemption = await tx.rewardRedemption.create({
      data: {
        userId,
        rewardId,
        pointsSpent: reward.pointsCost,
        code,
        expiresAt,
      },
    });

    // 7. Create loyalty transaction
    await tx.loyaltyTransaction.create({
      data: {
        userId,
        type: "redeem",
        points: -reward.pointsCost,
        balanceAfter: updatedUser.loyaltyPoints,
        rewardRedemptionId: redemption.id,
        note: `Redeemed: ${reward.name} (${reward.pointsCost} points)`,
      },
    });

    return { redemption, reward, newBalance: updatedUser.loyaltyPoints };
  });
}

// ─── Apply Redemption to Booking ─────────────────────────────────────────────

/**
 * Validate a redemption code and calculate the discount.
 * Does NOT mark as used or link to booking — caller must call
 * `linkRedemptionToBooking` after creating the booking.
 * Must be called inside a prisma.$transaction for atomicity.
 */
export async function applyRedemptionToBooking(
  tx: TxClient,
  userId: string,
  redemptionCode: string | undefined | null,
  originalPrice: number
): Promise<{ discountedPrice: number; discountAmount: number; redemptionId: string | null }> {
  if (!redemptionCode || !userId) {
    return { discountedPrice: originalPrice, discountAmount: 0, redemptionId: null };
  }

  // Look up the redemption
  const redemption = await tx.rewardRedemption.findUnique({
    where: { code: redemptionCode },
    include: { reward: true },
  });

  if (!redemption) throw new Error("Invalid redemption code");
  if (redemption.userId !== userId) throw new Error("Redemption code does not belong to you");
  if (redemption.status !== "active") throw new Error("Redemption code is no longer active");
  if (redemption.expiresAt && redemption.expiresAt < new Date()) {
    // Auto-expire
    await tx.rewardRedemption.update({
      where: { id: redemption.id },
      data: { status: "expired" },
    });
    throw new Error("Redemption code has expired");
  }

  // Calculate discount
  let discountAmount = 0;
  if (redemption.reward.discountType === "percent") {
    discountAmount = Math.round((originalPrice * redemption.reward.discountValue) / 100 * 100) / 100;
  } else if (redemption.reward.discountType === "fixed") {
    discountAmount = Math.min(redemption.reward.discountValue, originalPrice);
  } else if (redemption.reward.discountType === "free_service") {
    discountAmount = originalPrice;
  }

  const discountedPrice = Math.max(0, originalPrice - discountAmount);

  return { discountedPrice, discountAmount, redemptionId: redemption.id };
}

/**
 * Mark a redemption as used and link it to a booking.
 * Call this AFTER the booking is created, inside the same transaction.
 */
export async function linkRedemptionToBooking(
  tx: TxClient,
  redemptionId: string,
  bookingId: string
) {
  await tx.rewardRedemption.update({
    where: { id: redemptionId },
    data: {
      status: "used",
      bookingId,
      usedAt: new Date(),
    },
  });
}

// ─── Queries ───────────────────────────────────────────────────────────────────

/** Get user's loyalty balance + paginated transaction history. */
export async function getLoyaltyHistory(userId: string, page = 1, limit = 20) {
  const [user, transactions, total] = await Promise.all([
    db.user.findUnique({
      where: { id: userId },
      select: { loyaltyPoints: true },
    }),
    db.loyaltyTransaction.findMany({
      where: { userId },
      orderBy: { createdAt: "desc" },
      skip: (page - 1) * limit,
      take: limit,
      include: {
        booking: { select: { id: true, date: true, timeSlot: true } },
        redemption: {
          select: {
            id: true,
            code: true,
            reward: { select: { name: true } },
          },
        },
      },
    }),
    db.loyaltyTransaction.count({ where: { userId } }),
  ]);

  return {
    balance: user?.loyaltyPoints ?? 0,
    transactions,
    pagination: {
      page,
      limit,
      total,
      totalPages: Math.ceil(total / limit),
    },
  };
}

/** Get active, in-stock rewards. */
export async function getActiveRewards(serviceId?: string) {
  const where: Record<string, unknown> = {
    isActive: true,
    OR: [{ stock: null }, { stock: { gt: 0 } }],
  };
  if (serviceId) where.serviceId = serviceId;

  return db.loyaltyReward.findMany({
    where,
    orderBy: { pointsCost: "asc" },
    include: {
      service: { select: { id: true, name: true } },
      _count: { select: { redemptions: { where: { status: "active" } } } },
    },
  });
}

/** Look up a redemption by code (for applying at checkout). */
export async function getRedemptionByCode(code: string, userId: string) {
  const redemption = await db.rewardRedemption.findUnique({
    where: { code },
    include: {
      reward: true,
      user: { select: { id: true, name: true } },
    },
  });

  if (!redemption) return null;
  if (redemption.userId !== userId) return null;
  if (redemption.status !== "active") return null;
  if (redemption.expiresAt && redemption.expiresAt < new Date()) {
    // Auto-expire
    await db.rewardRedemption.update({
      where: { id: redemption.id },
      data: { status: "expired" },
    });
    return null;
  }

  return redemption;
}

// ─── Admin: Overview Stats ─────────────────────────────────────────────────────

export async function getLoyaltyOverview() {
  const [
    totalPointsOutstanding,
    totalEarned,
    totalRedeemed,
    totalUsersWithPoints,
    topEarners,
    redemptionCount,
  ] = await Promise.all([
    db.user.aggregate({ _sum: { loyaltyPoints: true } }),
    db.loyaltyTransaction.aggregate({
      where: { type: "earn" },
      _sum: { points: true },
    }),
    db.loyaltyTransaction.aggregate({
      where: { type: "redeem" },
      _sum: { points: true },
    }),
    db.user.count({ where: { loyaltyPoints: { gt: 0 } } }),
    db.user.findMany({
      where: { loyaltyPoints: { gt: 0 } },
      orderBy: { loyaltyPoints: "desc" },
      take: 10,
      select: { id: true, name: true, email: true, loyaltyPoints: true },
    }),
    db.rewardRedemption.count({ where: { status: "used" } }),
  ]);

  return {
    totalPointsOutstanding: totalPointsOutstanding._sum.loyaltyPoints ?? 0,
    totalPointsEarned: totalEarned._sum.points ?? 0,
    totalPointsRedeemed: Math.abs(totalRedeemed._sum.points ?? 0),
    totalUsersWithPoints,
    topEarners,
    redemptionCount,
  };
}
