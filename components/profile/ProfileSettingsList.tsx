"use client";

import Link from "next/link";
import { useAuth } from "@/lib/auth-context";
import { PushNotificationRow } from "./PushNotificationRow";

function ChevronRight() {
  return (
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
      className="text-[#6B5F52] shrink-0 transition-transform duration-150 group-hover:translate-x-0.5 group-hover:text-[#2B241D] motion-reduce:transition-none"
    >
      <polyline points="9 18 15 12 9 6" />
    </svg>
  );
}

export function ProfileSettingsList() {
  const { isAdmin, logout } = useAuth();

  return (
    <nav aria-label="Account Settings" className="w-full space-y-6">
      {/* ACCOUNT Group */}
      <div>
        <h2 className="text-[12px] font-semibold uppercase tracking-[0.12em] text-[#6B5F52] px-1 mb-2">
          ACCOUNT
        </h2>
        <div className="bg-white rounded-[20px] border border-[#E6DDD0] divide-y divide-[#EEE6DA] overflow-hidden shadow-xs">
          <Link
            href="/profile?section=profile"
            className="group min-h-[56px] px-5 py-3.5 flex items-center justify-between text-left hover:bg-[#FAF7F2] active:bg-[#F2ECE3] transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-[#A8573A]"
          >
            <div className="pr-4">
              <span className="text-[15px] font-medium text-[#2B241D] block">
                Profile details
              </span>
              <span className="text-[13px] text-[#6B5F52] block mt-0.5 font-normal">
                Name, email and phone
              </span>
            </div>
            <ChevronRight />
          </Link>

          <Link
            href="/profile?section=security"
            className="group min-h-[56px] px-5 py-4 flex items-center justify-between text-left hover:bg-[#FAF7F2] active:bg-[#F2ECE3] transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-[#A8573A]"
          >
            <span className="text-[15px] font-medium text-[#2B241D]">
              Security
            </span>
            <ChevronRight />
          </Link>
        </div>
      </div>

      {/* ACTIVITY Group */}
      <div>
        <h2 className="text-[12px] font-semibold uppercase tracking-[0.12em] text-[#6B5F52] px-1 mb-2">
          ACTIVITY
        </h2>
        <div className="bg-white rounded-[20px] border border-[#E6DDD0] divide-y divide-[#EEE6DA] overflow-hidden shadow-xs">
          <Link
            href="/profile?section=bookings"
            className="group min-h-[56px] px-5 py-4 flex items-center justify-between text-left hover:bg-[#FAF7F2] active:bg-[#F2ECE3] transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-[#A8573A]"
          >
            <span className="text-[15px] font-medium text-[#2B241D]">
              My Bookings
            </span>
            <ChevronRight />
          </Link>

          <Link
            href="/profile?section=waitlist"
            className="group min-h-[56px] px-5 py-4 flex items-center justify-between text-left hover:bg-[#FAF7F2] active:bg-[#F2ECE3] transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-[#A8573A]"
          >
            <span className="text-[15px] font-medium text-[#2B241D]">
              My Waitlist
            </span>
            <ChevronRight />
          </Link>
        </div>
      </div>

      {/* ADMINISTRATION Group (Admin only) */}
      {isAdmin && (
        <div>
          <h2 className="text-[12px] font-semibold uppercase tracking-[0.12em] text-[#6B5F52] px-1 mb-2">
            ADMINISTRATION
          </h2>
          <div className="bg-white rounded-[20px] border border-[#E6DDD0] overflow-hidden shadow-xs">
            <Link
              href="/admin"
              className="group min-h-[56px] px-5 py-4 flex items-center justify-between text-left hover:bg-[#FAF7F2] active:bg-[#F2ECE3] transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-[#A8573A]"
            >
              <span className="text-[15px] font-medium text-[#A8573A]">
                Admin Console
              </span>
              <ChevronRight />
            </Link>
          </div>
        </div>
      )}

      {/* PREFERENCES Group */}
      <div>
        <h2 className="text-[12px] font-semibold uppercase tracking-[0.12em] text-[#6B5F52] px-1 mb-2">
          PREFERENCES
        </h2>
        <div className="bg-white rounded-[20px] border border-[#E6DDD0] overflow-hidden shadow-xs">
          <PushNotificationRow />
        </div>
      </div>

      {/* SIGN OUT Button */}
      <div className="pt-2">
        <button
          type="button"
          onClick={() => logout()}
          className="w-full min-h-[52px] rounded-[16px] border border-[#E6DDD0] bg-white hover:bg-red-50/60 active:scale-[0.99] text-red-600 font-medium text-sm flex items-center justify-center gap-2 transition-all cursor-pointer shadow-xs focus:outline-none focus-visible:ring-2 focus-visible:ring-red-400"
        >
          <svg
            width="16"
            height="16"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="1.8"
            strokeLinecap="round"
            strokeLinejoin="round"
            aria-hidden="true"
          >
            <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" />
            <polyline points="16 17 21 12 16 7" />
            <line x1="21" y1="12" x2="9" y2="12" />
          </svg>
          <span>Sign Out</span>
        </button>
      </div>
    </nav>
  );
}

export function ProfileSettingsListSkeleton() {
  return (
    <div className="w-full space-y-6 animate-pulse" aria-hidden="true">
      <div>
        <div className="h-3 w-20 bg-[#E8DDD0] rounded mb-2" />
        <div className="bg-white rounded-[20px] border border-[#E6DDD0] divide-y divide-[#EEE6DA] overflow-hidden">
          <div className="h-[68px] px-5 py-3.5 flex items-center justify-between">
            <div className="space-y-1.5">
              <div className="h-4 w-28 bg-[#E8DDD0] rounded" />
              <div className="h-3 w-40 bg-[#F0EAE1] rounded" />
            </div>
            <div className="h-4 w-4 bg-[#E8DDD0] rounded" />
          </div>
          <div className="h-[56px] px-5 py-4 flex items-center justify-between">
            <div className="h-4 w-20 bg-[#E8DDD0] rounded" />
            <div className="h-4 w-4 bg-[#E8DDD0] rounded" />
          </div>
        </div>
      </div>

      <div>
        <div className="h-3 w-20 bg-[#E8DDD0] rounded mb-2" />
        <div className="bg-white rounded-[20px] border border-[#E6DDD0] divide-y divide-[#EEE6DA] overflow-hidden">
          <div className="h-[56px] px-5 py-4 flex items-center justify-between">
            <div className="h-4 w-24 bg-[#E8DDD0] rounded" />
            <div className="h-4 w-4 bg-[#E8DDD0] rounded" />
          </div>
          <div className="h-[56px] px-5 py-4 flex items-center justify-between">
            <div className="h-4 w-24 bg-[#E8DDD0] rounded" />
            <div className="h-4 w-4 bg-[#E8DDD0] rounded" />
          </div>
        </div>
      </div>

      <div>
        <div className="h-3 w-24 bg-[#E8DDD0] rounded mb-2" />
        <div className="bg-white rounded-[20px] border border-[#E6DDD0] overflow-hidden">
          <div className="h-[60px] px-5 py-4 flex items-center justify-between">
            <div className="h-4 w-36 bg-[#E8DDD0] rounded" />
            <div className="h-7 w-12 bg-[#E8DDD0] rounded-full" />
          </div>
        </div>
      </div>
    </div>
  );
}
