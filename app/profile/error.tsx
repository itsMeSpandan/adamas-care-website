"use client";

import { useEffect } from "react";
import Link from "next/link";

interface ErrorProps {
  error: Error & { digest?: string };
  reset: () => void;
}

export default function ProfileError({ error, reset }: ErrorProps) {
  useEffect(() => {
    console.error("[Profile Error]", error);
  }, [error]);

  return (
    <div className="section-padding bg-beige-50">
      <div className="section-container mx-auto max-w-2xl text-center">
        <div className="mx-auto mb-6 flex h-16 w-16 items-center justify-center rounded-full bg-beige-100">
          <svg
            width="28"
            height="28"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="1.5"
            strokeLinecap="round"
            strokeLinejoin="round"
            className="text-beige-400"
          >
            <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
            <circle cx="12" cy="7" r="4" />
          </svg>
        </div>
        <h1 className="font-serif text-2xl font-semibold text-beige-700">
          Profile Error
        </h1>
        <p className="mt-2 max-w-md text-sm text-beige-600">
          We couldn&apos;t load your profile information. This might be a
          temporary issue. Please try again.
        </p>
        <div className="mt-6 flex justify-center gap-3">
          <button onClick={reset} className="btn-primary text-sm">
            Try Again
          </button>
          <Link href="/" className="btn-outline text-sm">
            Back to Home
          </Link>
        </div>
      </div>
    </div>
  );
}
