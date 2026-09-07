"use client";

import { useEffect, useState } from "react";
import Link from "next/link";

interface ErrorProps {
  error: Error & { digest?: string };
  reset: () => void;
}

export default function Error({ error, reset }: ErrorProps) {
  const [showDetails, setShowDetails] = useState(false);

  useEffect(() => {
    console.error("[Application Error]", error);
  }, [error]);

  return (
    <div className="flex min-h-[70vh] flex-col items-center justify-center bg-beige-50 px-4 text-center">
      {/* Animated error illustration */}
      <div className="relative mb-6">
        <svg
          width="160"
          height="160"
          viewBox="0 0 160 160"
          fill="none"
          className="drop-shadow-sm"
        >
          {/* Pulsing circle */}
          <circle
            cx="80"
            cy="80"
            r="65"
            stroke="#e8ddd3"
            strokeWidth="2"
            fill="#faf6f1"
          >
            <animate
              attributeName="r"
              values="60;65;60"
              dur="3s"
              repeatCount="indefinite"
            />
          </circle>
          {/* Warning triangle */}
          <path
            d="M80 40 L110 100 H50 Z"
            fill="none"
            stroke="#c9b8a8"
            strokeWidth="2.5"
            strokeLinejoin="round"
          />
          {/* Exclamation mark */}
          <line
            x1="80"
            y1="58"
            x2="80"
            y2="78"
            stroke="#c9b8a8"
            strokeWidth="3"
            strokeLinecap="round"
          />
          <circle cx="80" cy="88" r="2" fill="#c9b8a8" />
          {/* Decorative elements */}
          <circle cx="20" cy="30" r="2" fill="#e8ddd3" />
          <circle cx="140" cy="35" r="2.5" fill="#e8ddd3" />
          <circle cx="15" cy="120" r="2" fill="#e8ddd3" />
          <circle cx="145" cy="125" r="2" fill="#e8ddd3" />
        </svg>
      </div>

      <h1 className="font-serif text-3xl font-semibold text-beige-700 md:text-4xl">
        Something Went Wrong
      </h1>
      <p className="mt-3 max-w-md text-beige-600">
        We encountered an unexpected error while processing your request.
        Please try again or contact us if the problem persists.
      </p>

      {/* Action buttons */}
      <div className="mt-8 flex flex-wrap gap-4">
        <button onClick={reset} className="btn-primary">
          <svg
            width="16"
            height="16"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
            className="mr-2"
          >
            <path d="M21 12a9 9 0 0 0-9-9 9.75 9.75 0 0 0-6.74 2.74L3 8" />
            <path d="M3 3v5h5" />
            <path d="M3 12a9 9 0 0 0 9 9 9.75 9.75 0 0 0 6.74-2.74L21 16" />
            <path d="M21 21v-5h-5" />
          </svg>
          Try Again
        </button>
        <Link href="/" className="btn-outline">
          Back to Home
        </Link>
      </div>

      {/* Error details toggle */}
      {error.digest && (
        <div className="mt-8 w-full max-w-lg">
          <button
            onClick={() => setShowDetails(!showDetails)}
            className="flex items-center gap-2 text-xs text-beige-400 transition-colors hover:text-beige-600"
          >
            <svg
              width="14"
              height="14"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
              className={`transition-transform ${showDetails ? "rotate-90" : ""}`}
            >
              <polyline points="9 18 15 12 9 6" />
            </svg>
            {showDetails ? "Hide" : "Show"} error details
          </button>
          {showDetails && (
            <div className="mt-3 rounded-xl border border-beige-200 bg-white p-4 text-left">
              <p className="text-xs font-medium text-beige-500">Error ID</p>
              <p className="mt-1 font-mono text-xs text-beige-600 break-all">
                {error.digest}
              </p>
              {error.message && (
                <>
                  <p className="mt-3 text-xs font-medium text-beige-500">Message</p>
                  <p className="mt-1 text-xs text-beige-600">{error.message}</p>
                </>
              )}
            </div>
          )}
        </div>
      )}

      {/* Contact note */}
      <p className="mt-6 text-xs text-beige-400">
        Need help?{" "}
        <a
          href="mailto:hello@gracesalon.com"
          className="underline underline-offset-2 transition-colors hover:text-beige-600"
        >
          Contact our support team
        </a>
      </p>
    </div>
  );
}
