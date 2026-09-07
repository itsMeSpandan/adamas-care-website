"use client";

import { useEffect } from "react";
import Link from "next/link";

interface ErrorProps {
  error: Error & { digest?: string };
  reset: () => void;
}

export default function EmployeeError({ error, reset }: ErrorProps) {
  useEffect(() => {
    console.error("[Employee Portal Error]", error);
  }, [error]);

  return (
    <div className="flex min-h-[60vh] flex-col items-center justify-center px-4 text-center">
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
          <path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2" />
          <circle cx="9" cy="7" r="4" />
          <line x1="19" x2="19" y1="8" y2="14" />
          <line x1="22" x2="16" y1="11" y2="11" />
        </svg>
      </div>
      <h1 className="font-serif text-2xl font-semibold text-beige-700">
        Employee Portal Error
      </h1>
      <p className="mt-2 max-w-md text-sm text-beige-600">
        Something went wrong while loading your employee dashboard. Please try
        again or contact admin if this persists.
      </p>
      <div className="mt-6 flex gap-3">
        <button onClick={reset} className="btn-primary text-sm">
          Try Again
        </button>
        <Link href="/employee" className="btn-outline text-sm">
          Employee Dashboard
        </Link>
      </div>
    </div>
  );
}
