"use client";

import { useState } from "react";
import StarIcon from "./StarIcon";
import { useToast } from "./Toast";

interface StarRatingProps {
  initialRating?: number;
  initialReview?: string;
  bookingId: string;
  onRatingSubmitted?: (bookingId: string, rating: number, review: string) => void;
  readonly?: boolean;
}

export default function StarRating({
  initialRating,
  initialReview = "",
  bookingId,
  onRatingSubmitted,
  readonly = false,
}: StarRatingProps) {
  const [hoverRating, setHoverRating] = useState<number | null>(null);
  const [selectedRating, setSelectedRating] = useState<number>(initialRating ?? 0);
  const [decimalInput, setDecimalInput] = useState<string>(
    initialRating ? String(initialRating) : ""
  );
  const [review, setReview] = useState(initialReview);
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(!!initialRating);
  const { showToast } = useToast();

  const displayRating = hoverRating ?? selectedRating;

  const handleStarClick = (starIndex: number) => {
    if (readonly || submitted) return;
    setSelectedRating(starIndex);
    setDecimalInput(String(starIndex));
  };

  const handleDecimalChange = (value: string) => {
    if (readonly || submitted) return;
    // Allow only valid decimal input (0-5 range)
    const num = parseFloat(value);
    if (value === "" || (!isNaN(num) && num >= 0 && num <= 5)) {
      setDecimalInput(value);
      if (!isNaN(num)) {
        setSelectedRating(Math.min(5, Math.max(0, num)));
      }
    }
  };

  const handleDecimalBlur = () => {
    if (readonly || submitted) return;
    const num = parseFloat(decimalInput);
    if (!isNaN(num)) {
      const clamped = Math.min(5, Math.max(0, Math.round(num * 10) / 10));
      setSelectedRating(clamped);
      setDecimalInput(String(clamped));
    } else {
      setDecimalInput(String(selectedRating));
    }
  };

  const handleSubmitRating = async () => {
    if (selectedRating <= 0 || submitting) return;
    setSubmitting(true);
    try {
      const res = await fetch(`/api/bookings/${bookingId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          rating: Math.round(selectedRating * 10) / 10,
          review: review.trim() || undefined,
        }),
      });
      if (res.ok) {
        setSubmitted(true);
        onRatingSubmitted?.(bookingId, selectedRating, review);
        showToast("Rating submitted successfully!", "success");
      }
    } catch {
      // silently fail
    } finally {
      setSubmitting(false);
    }
  };

  // Already rated and readonly
  if (readonly && initialRating) {
    return (
      <div className="space-y-1.5">
        <div className="flex items-center gap-2">
          <div className="flex items-center gap-0.5">
            {[1, 2, 3, 4, 5].map((star) => (
              <StarIcon key={star} filled={star <= Math.round(initialRating)} size={16} />
            ))}
          </div>
          <span className="text-sm font-semibold text-beige-700">{initialRating}/5</span>
        </div>
        {initialReview && (
          <p className="text-sm text-beige-600 italic">&ldquo;{initialReview}&rdquo;</p>
        )}
      </div>
    );
  }

  // Already submitted (interactive mode)
  if (submitted) {
    return (
      <div className="space-y-1.5">
        <div className="flex items-center gap-2">
          <div className="flex items-center gap-0.5">
            {[1, 2, 3, 4, 5].map((star) => (
              <StarIcon key={star} filled={star <= Math.round(selectedRating)} size={16} />
            ))}
          </div>
          <span className="text-sm font-semibold text-beige-700">{selectedRating}/5</span>
        </div>
        {review && (
          <p className="text-sm text-beige-600 italic">&ldquo;{review}&rdquo;</p>
        )}
      </div>
    );
  }

  // Interactive rating form
  return (
    <div className="space-y-3">
      {/* Star rating row */}
      <div className="flex items-center gap-3">
        <div className="flex items-center gap-1">
          {[1, 2, 3, 4, 5].map((star) => (
            <button
              key={star}
              type="button"
              onClick={() => handleStarClick(star)}
              onMouseEnter={() => !readonly && setHoverRating(star)}
              onMouseLeave={() => setHoverRating(null)}
              className="transition-transform hover:scale-110 focus:outline-none disabled:cursor-not-allowed"
              disabled={readonly || submitted}
              aria-label={`Rate ${star} stars`}
            >
              <StarIcon
                filled={star <= Math.floor(displayRating)}
                size={22}
                className={hoverRating !== null && star <= hoverRating ? "text-beige-500" : ""}
              />
            </button>
          ))}
        </div>

        {/* Decimal input */}
        <div className="flex items-center gap-1.5">
          <input
            type="text"
            inputMode="decimal"
            value={decimalInput}
            onChange={(e) => handleDecimalChange(e.target.value)}
            onBlur={handleDecimalBlur}
            placeholder="0.0"
            disabled={readonly || submitted}
            className="w-16 rounded-lg border border-beige-300 bg-white px-2 py-1 text-center text-sm text-beige-800 placeholder:text-beige-400 focus:border-beige-500 focus:outline-none focus:ring-1 focus:ring-beige-200 disabled:cursor-not-allowed"
          />
          <span className="text-xs text-beige-500">/5</span>
        </div>
      </div>

      {/* Review textarea */}
      <textarea
        value={review}
        onChange={(e) => setReview(e.target.value)}
        placeholder="Write a review (optional)..."
        disabled={readonly || submitted}
        rows={2}
        className="w-full rounded-xl border border-beige-300 bg-white px-3 py-2 text-sm text-beige-800 placeholder:text-beige-400 focus:border-beige-500 focus:outline-none focus:ring-2 focus:ring-beige-200 resize-none disabled:cursor-not-allowed"
      />

      {/* Submit button */}
      <button
        type="button"
        onClick={handleSubmitRating}
        disabled={submitting || selectedRating <= 0}
        className="rounded-lg bg-beige-600 px-4 py-2.5 text-sm font-medium text-white transition-colors hover:bg-beige-700 disabled:cursor-not-allowed disabled:opacity-50 shadow-sm"
      >
        {submitting ? "Submitting..." : "Submit Rating"}
      </button>
    </div>
  );
}
