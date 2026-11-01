import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getSession } from "@/lib/auth";
import { rateLimit, getRateLimitKey } from "@/lib/rate-limit";
import {
  feedbackSubmissionSchema,
  isBookingEligibleForFeedback,
  isLowRating,
  sanitizeComment,
} from "@/lib/feedback";
import { notifyAdminLowFeedback } from "@/lib/notify";

export const dynamic = "force-dynamic";

const feedbackLimiter = rateLimit({ windowMs: 600_000, max: 10 }); // 10 submits per 10 min

/**
 * POST /api/feedback
 *
 * Customer feedback submission endpoint.
 * Enforces:
 * - Authentication & ownership
 * - Completed status & 14-day window
 * - Strict one-submission idempotency per booking
 * - Admin flagging & notification for low ratings (<= 2 stars)
 */
export async function POST(request: Request) {
  try {
    const session = await getSession();
    if (!session || !session.userId) {
      return NextResponse.json({ error: "Authentication required" }, { status: 401 });
    }

    const key = getRateLimitKey(request, session.userId);
    const limitResult = await feedbackLimiter.checkAsync(key);
    if (!limitResult.success) {
      return NextResponse.json(
        { error: "Too many feedback requests. Please wait a moment." },
        { status: 429, headers: { "Retry-After": String(Math.ceil(limitResult.retryAfterMs / 1000)) } }
      );
    }

    const body = await request.json();
    const parsed = feedbackSubmissionSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: "Invalid feedback data", details: parsed.error.flatten() },
        { status: 400 }
      );
    }

    const {
      bookingId,
      overallRating,
      npsScore,
      overallTags,
      overallComment,
      employeeRatings,
      serviceRatings,
    } = parsed.data;

    // Check booking existence & ownership
    const booking = await db.booking.findUnique({
      where: { id: bookingId },
      include: {
        feedback: { select: { id: true } },
      },
    });

    if (!booking) {
      return NextResponse.json({ error: "Booking not found" }, { status: 404 });
    }

    if (booking.userId !== session.userId && session.role !== "admin") {
      return NextResponse.json(
        { error: "You can only submit feedback for your own bookings" },
        { status: 403 }
      );
    }

    const { eligible, reason } = isBookingEligibleForFeedback({
      status: booking.status,
      userId: booking.userId,
      completedAt: booking.completedAt,
      date: booking.date,
      feedback: booking.feedback,
    });

    if (!eligible) {
      return NextResponse.json({ error: reason || "Booking is not eligible for feedback" }, { status: 400 });
    }

    const cleanOverallComment = sanitizeComment(overallComment);
    const flagged = isLowRating(overallRating, employeeRatings, serviceRatings);

    // Atomic transaction for feedback and child ratings
    const createdFeedback = await db.$transaction(async (tx) => {
      const fb = await tx.feedback.create({
        data: {
          bookingId: booking.id,
          userId: session.userId,
          source: "app",
          overallRating,
          npsScore: npsScore ?? null,
          overallTags,
          overallComment: cleanOverallComment,
          status: "NEW",
          isFlagged: flagged,
        },
      });

      // Employee ratings
      if (employeeRatings && employeeRatings.length > 0) {
        for (const er of employeeRatings) {
          await tx.feedbackEmployeeRating.create({
            data: {
              feedbackId: fb.id,
              employeeId: er.employeeId,
              rating: er.rating,
              tags: er.tags,
              comment: sanitizeComment(er.comment),
            },
          });
        }
      }

      // Service ratings
      if (serviceRatings && serviceRatings.length > 0) {
        for (const sr of serviceRatings) {
          await tx.feedbackServiceRating.create({
            data: {
              feedbackId: fb.id,
              serviceId: sr.serviceId,
              rating: sr.rating,
              tags: sr.tags,
              comment: sanitizeComment(sr.comment),
            },
          });
        }
      }

      // Sync backward-compatible fields on Booking
      await tx.booking.update({
        where: { id: booking.id },
        data: {
          rating: overallRating,
          review: cleanOverallComment,
        },
      });

      return fb;
    });

    // Notify administrators if rating <= 2 stars
    if (flagged) {
      const customerName = booking.name || session.email || "Customer";
      notifyAdminLowFeedback({
        feedbackId: createdFeedback.id,
        bookingId: booking.id,
        rating: overallRating,
        customerName,
      }).catch((err) => console.error("[Feedback] Admin low rating notification error:", err));
    }

    return NextResponse.json(
      {
        success: true,
        message: "Thank you for your feedback!",
        feedbackId: createdFeedback.id,
      },
      { status: 201 }
    );
  } catch (error: unknown) {
    const prismaErr = error as { code?: string };
    // Unique constraint violation (concurrent duplicate submit)
    if (prismaErr?.code === "P2002") {
      return NextResponse.json(
        { error: "Feedback has already been submitted for this booking." },
        { status: 409 }
      );
    }
    console.error("[Submit Feedback Error]:", error);
    return NextResponse.json({ error: "Failed to submit feedback" }, { status: 500 });
  }
}
