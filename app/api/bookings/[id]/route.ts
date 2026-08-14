import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { requireAuth } from "@/lib/require-auth";
import { awardPointsForBooking, clawbackPointsForBooking } from "@/lib/loyalty";

export const dynamic = "force-dynamic";

// Helper function for retry with exponential backoff
async function retryWithBackoff<T>(
  fn: () => Promise<T>,
  maxRetries = 3,
  baseDelay = 500
): Promise<T> {
  let lastError: Error;
  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      return await fn();
    } catch (error) {
      lastError = error instanceof Error ? error : new Error(String(error));
      if (attempt === maxRetries) break;
      const delay = baseDelay * Math.pow(2, attempt);
      await new Promise((resolve) => setTimeout(resolve, delay));
    }
  }
  throw lastError!;
}

export const PATCH = requireAuth(async (request: Request, context) => {
  const { id } = await context!.params!;
  try {
    const body = await request.json();
    const { status, rating, review } = body;

    // Handle status updates
    if (status) {
      if (!["pending", "confirmed", "completed", "cancelled"].includes(status)) {
        return NextResponse.json(
          { error: "Invalid status. Must be one of: pending, confirmed, completed, cancelled" },
          { status: 400 }
        );
      }
      // Atomic: status update + loyalty in a single transaction to prevent desync
      const booking = await db.$transaction(async (tx) => {
        const updated = await tx.booking.update({ where: { id }, data: { status } });

        if (status === "completed" && updated.userId) {
          await retryWithBackoff(() => awardPointsForBooking(id, tx));
        } else if (status === "cancelled") {
          await retryWithBackoff(() => clawbackPointsForBooking(id, tx));
        }

        return updated;
      });

      return NextResponse.json({ booking });
    }

    // Handle rating/review updates
    if (rating !== undefined) {
      const numRating = Number(rating);
      if (isNaN(numRating) || numRating < 0 || numRating > 5) {
        return NextResponse.json(
          { error: "Invalid rating. Must be between 0 and 5" },
          { status: 400 }
        );
      }

      const booking = await db.booking.update({
        where: { id },
        data: {
          rating: Math.round(numRating * 10) / 10,
          review: review ?? null,
        },
      });
      return NextResponse.json({ booking });
    }

    return NextResponse.json(
      { error: "Nothing to update. Provide status, rating, or review." },
      { status: 400 }
    );
  } catch (error) {
    console.error("Failed to update booking:", error);
    return NextResponse.json(
      { error: "Failed to update booking" },
      { status: 500 }
    );
  }
});
