"use client";

import Link from "next/link";
import {
  formatMemberSince,
  formatLoyaltyPoints,
  getRoleBadge,
  shouldShowPoints,
} from "@/lib/profile-utils";

export interface MemberCardProps {
  name: string;
  role?: string | null;
  loyaltyPoints?: number | null;
  createdAt?: string | null;
}

export function MemberCard({
  name,
  role,
  loyaltyPoints,
  createdAt,
}: MemberCardProps) {
  const roleBadge = getRoleBadge(role);
  const showPts = shouldShowPoints(role, loyaltyPoints);
  const pointsFormatted = formatLoyaltyPoints(loyaltyPoints);
  const memberSince = formatMemberSince(createdAt);

  return (
    <div className="w-full max-w-[340px] flex flex-col gap-3">
      {/* Visual Member Card */}
      <div
        className="relative w-full h-[210px] rounded-[22px] p-6 text-white flex flex-col justify-between shadow-[0_8px_24px_rgba(122,63,43,0.18)] select-none overflow-hidden"
        style={{
          background: "linear-gradient(135deg, #C97B5C 0%, #7A3F2B 100%)",
        }}
        role="region"
        aria-label="Member identification card"
      >
        {/* Top row */}
        <div className="flex items-center justify-between text-[12px] font-semibold tracking-[0.2em] uppercase text-white/95">
          <span>ADAMAS CARE</span>
          <span>{roleBadge}</span>
        </div>

        {/* Middle row: Real loyalty points */}
        <div className="my-auto flex items-baseline">
          {showPts ? (
            <>
              <span className="font-serif text-[56px] leading-none text-white tracking-tight">
                {pointsFormatted}
              </span>
              <span className="text-[15px] font-sans text-white/90 ml-1.5 font-normal">
                pts
              </span>
            </>
          ) : (
            <div className="h-[56px]" aria-hidden="true" />
          )}
        </div>

        {/* Bottom row: Name & Member Since */}
        <div className="min-w-0">
          <p
            className="text-[18px] font-medium text-white truncate max-w-full leading-tight"
            title={name}
          >
            {name || "Member"}
          </p>
          {memberSince && (
            <p className="text-[13px] text-[#F6E7DE] truncate mt-1 leading-normal font-normal">
              {memberSince}
            </p>
          )}
        </div>
      </div>

      {/* Action Buttons */}
      <div className="flex flex-col gap-3 w-full">
        <Link
          href="/booking"
          className="w-full h-12 rounded-[12px] bg-[#A8573A] hover:bg-[#934a30] active:scale-[0.99] text-white font-medium text-sm flex items-center justify-center transition-all shadow-xs focus:outline-none focus-visible:ring-2 focus-visible:ring-[#A8573A] focus-visible:ring-offset-2"
        >
          Book a Treatment
        </Link>
        <Link
          href="/account/loyalty"
          className="w-full h-12 rounded-[12px] border border-[#CDBFAE] bg-transparent hover:bg-white/60 active:scale-[0.99] text-[#2B241D] font-medium text-sm flex items-center justify-center transition-all focus:outline-none focus-visible:ring-2 focus-visible:ring-[#A8573A] focus-visible:ring-offset-2"
        >
          View Rewards
        </Link>
      </div>
    </div>
  );
}

export function MemberCardSkeleton() {
  return (
    <div className="w-full max-w-[340px] flex flex-col gap-3 animate-pulse" aria-hidden="true">
      <div className="w-full h-[210px] rounded-[22px] bg-[#E8DDD0] p-6 flex flex-col justify-between">
        <div className="flex justify-between items-center">
          <div className="h-3 w-24 bg-[#D8CBBD] rounded" />
          <div className="h-3 w-16 bg-[#D8CBBD] rounded" />
        </div>
        <div className="h-12 w-20 bg-[#D8CBBD] rounded my-auto" />
        <div className="space-y-2">
          <div className="h-4 w-32 bg-[#D8CBBD] rounded" />
          <div className="h-3 w-40 bg-[#D8CBBD] rounded" />
        </div>
      </div>
      <div className="flex flex-col gap-3 w-full">
        <div className="w-full h-12 rounded-[12px] bg-[#E8DDD0]" />
        <div className="w-full h-12 rounded-[12px] bg-[#E8DDD0]" />
      </div>
    </div>
  );
}
