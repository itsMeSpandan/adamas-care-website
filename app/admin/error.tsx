"use client";

import { useEffect } from "react";
import Link from "next/link";

interface ErrorProps {
  error: Error & { digest?: string };
  reset: () => void;
}

export default function AdminError({ error, reset }: ErrorProps) {
  useEffect(() => {
    console.error("[Admin Error]", error);
  }, [error]);

  return (
    <div className="flex min-h-[60vh] flex-col items-center justify-center px-4 text-center">
      <div className="mx-auto mb-6 flex h-16 w-16 items-center justify-center rounded-full bg-red-50">
        <svg
          width="28"
          height="28"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.5"
          strokeLinecap="round"
          strokeLinejoin="round"
          className="text-red-400"
        >
          <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10" />
          <line x1="12" x2="12" y1="8" y2="12" />
          <line x1="12" x2="12.01" y1="16" y2="16" />
        </svg>
      </div>
      <h1 className="font-serif text-2xl font-semibold text-beige-700">
        Admin Panel Error
      </h1>
      <p className="mt-2 max-w-md text-sm text-beige-600">
        Something went wrong in the admin dashboard. This might be a
        temporary issue with the data or permissions.
      </p>
      <div className="mt-6 flex gap-3">
        <button onClick={reset} className="btn-primary text-sm">
          Try Again
        </button>
        <Link href="/admin" className="btn-outline text-sm">
          Admin Dashboard
        </Link>
      </div>
      {error.digest && (
        <p className="mt-4 font-mono text-xs text-beige-400">
          Error: {error.digest}
        </p>
      )}
    </div>
  );
}
