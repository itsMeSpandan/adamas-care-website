"use client";

import { useEffect } from "react";
import Link from "next/link";

interface ErrorProps {
  error: Error & { digest?: string };
  reset: () => void;
}

export default function BookingError({ error, reset }: ErrorProps) {
  useEffect(() => {
    console.error("[Booking Error]", error);
  }, [error]);

  return (
    <div className="section-padding bg-beige-50">
      <div className="section-container mx-auto max-w-2xl text-center">
        <div className="mx-auto mb-6 flex h-16 w-16 items-center justify-center rounded-full bg-amber-50">
          <svg
            width="28"
            height="28"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="1.5"
            strokeLinecap="round"
            strokeLinejoin="round"
            className="text-amber-500"
          >
            <rect width="18" height="18" x="3" y="4" rx="2" ry="2" />
            <line x1="16" x2="16" y1="2" y2="6" />
            <line x1="8" x2="8" y1="2" y2="6" />
            <line x1="3" x2="21" y1="10" y2="10" />
          </svg>
        </div>
        <h1 className="font-serif text-2xl font-semibold text-beige-700">
          Booking System Error
        </h1>
        <p className="mt-2 max-w-md text-sm text-beige-600">
          We couldn&apos;t complete your booking request. This might be due to a
          slot conflict or a temporary issue. Please try again.
        </p>
        <div className="mt-6 flex justify-center gap-3">
          <button onClick={reset} className="btn-primary text-sm">
            Try Again
          </button>
          <Link href="/booking" className="btn-outline text-sm">
            Restart Booking
          </Link>
        </div>
      </div>
    </div>
  );
}
