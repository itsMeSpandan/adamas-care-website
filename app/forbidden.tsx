import Link from "next/link";
import { BRAND } from "@/lib/brand";

export default function Forbidden() {
  return (
    <div className="flex min-h-[70vh] flex-col items-center justify-center bg-beige-50 px-4 text-center">
      {/* Lock illustration */}
      <div className="relative mb-6">
        <svg
          width="140"
          height="140"
          viewBox="0 0 140 140"
          fill="none"
          className="drop-shadow-sm"
        >
          {/* Background circle */}
          <circle cx="70" cy="70" r="60" fill="#faf6f1" stroke="#e8ddd3" strokeWidth="1.5" />
          {/* Lock body */}
          <rect
            x="52"
            y="72"
            width="36"
            height="28"
            rx="4"
            fill="none"
            stroke="#c9b8a8"
            strokeWidth="2.5"
          />
          {/* Lock shackle */}
          <path
            d="M58 72 V62 C58 53.16 64.16 47 73 47 H67 C75.84 47 82 53.16 82 62 V72"
            fill="none"
            stroke="#c9b8a8"
            strokeWidth="2.5"
            strokeLinecap="round"
          />
          {/* Keyhole */}
          <circle cx="70" cy="82" r="3" fill="#c9b8a8" />
          <rect x="69" y="84" width="2" height="6" rx="1" fill="#c9b8a8" />
          {/* Decorative dots */}
          <circle cx="20" cy="30" r="2" fill="#e8ddd3" />
          <circle cx="120" cy="25" r="2.5" fill="#e8ddd3" />
          <circle cx="25" cy="110" r="2" fill="#e8ddd3" />
          <circle cx="115" cy="115" r="2" fill="#e8ddd3" />
        </svg>
      </div>

      {/* Error code */}
      <span className="font-serif text-7xl font-bold tracking-tight text-beige-300 sm:text-8xl">
        403
      </span>

      <h1 className="mt-4 font-serif text-3xl font-semibold text-beige-700 md:text-4xl">
        Access Denied
      </h1>
      <p className="mt-3 max-w-md text-beige-600">
        You don&apos;t have permission to access this page. If you believe this
        is a mistake, please sign in with the correct account or contact an
        administrator.
      </p>

      {/* Action buttons */}
      <div className="mt-8 flex flex-wrap gap-4">
        <Link href="/" className="btn-primary">
          Back to Home
        </Link>
        <Link href="/booking" className="btn-outline">
          Book a Service
        </Link>
      </div>

      {/* Help text */}
      <div className="mt-10 rounded-xl border border-beige-200 bg-white px-6 py-4 text-left">
        <p className="text-xs font-medium text-beige-500">Need access?</p>
        <ul className="mt-2 space-y-1.5 text-xs text-beige-600">
          <li className="flex items-start gap-2">
            <span className="mt-0.5 h-1 w-1 flex-shrink-0 rounded-full bg-beige-300" />
            Make sure you&apos;re signed in with the right account
          </li>
          <li className="flex items-start gap-2">
            <span className="mt-0.5 h-1 w-1 flex-shrink-0 rounded-full bg-beige-300" />
            Contact {BRAND.name} admin for role-based access
          </li>
          <li className="flex items-start gap-2">
            <span className="mt-0.5 h-1 w-1 flex-shrink-0 rounded-full bg-beige-300" />
            <a
              href={`mailto:${BRAND.email}`}
              className="underline underline-offset-2 transition-colors hover:text-beige-700"
            >
              Email support
            </a>{" "}
            for help
          </li>
        </ul>
      </div>
    </div>
  );
}
