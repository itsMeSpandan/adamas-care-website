"use client";

import Link from "next/link";

interface ProfileSectionHeaderProps {
  title: string;
}

export function ProfileSectionHeader({ title }: ProfileSectionHeaderProps) {
  return (
    <div className="mb-6">
      {/* Desktop navigation link */}
      <div className="hidden md:block mb-3">
        <Link
          href="/profile"
          className="inline-flex items-center gap-2 text-sm font-medium text-[#6B5F52] hover:text-[#A8573A] transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-[#A8573A] rounded-md px-1 py-1"
        >
          <svg
            width="18"
            height="18"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
            aria-hidden="true"
          >
            <line x1="19" y1="12" x2="5" y2="12" />
            <polyline points="12 19 5 12 12 5" />
          </svg>
          <span>Back to settings</span>
        </Link>
      </div>

      {/* Mobile top bar with 44px tap target back button */}
      <div className="flex md:hidden items-center gap-3">
        <Link
          href="/profile"
          aria-label="Back to settings"
          className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-white border border-[#E6DDD0] text-[#2B241D] hover:bg-[#FAF7F2] active:scale-95 transition-all focus:outline-none focus-visible:ring-2 focus-visible:ring-[#A8573A]"
        >
          <svg
            width="20"
            height="20"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
            aria-hidden="true"
          >
            <line x1="19" y1="12" x2="5" y2="12" />
            <polyline points="12 19 5 12 12 5" />
          </svg>
        </Link>
        <h1 className="font-serif text-2xl font-semibold text-[#2B241D] truncate">
          {title}
        </h1>
      </div>
    </div>
  );
}
