"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import { Calendar, Gift } from "lucide-react";
import { cn } from "@/lib/utils";
import {
  formatLoyaltyPoints,
  formatMemberSinceShort,
  formatMemberId,
} from "@/lib/profile-utils";

export type MembershipTier = "member" | "silver" | "gold" | "admin" | "specialist";

export interface TierStyleConfig {
  name: string;
  badgeLabel: string;
  badgeClass?: string;
  cardGradient: string;
  cardBorder: string;
  tagBg: string;
  tagColor: string;
  tagBorder: string;
}

export const TIER_CONFIGS: Record<MembershipTier, TierStyleConfig> = {
  member: {
    name: "Member",
    badgeLabel: "MEMBER",
    cardGradient: "linear-gradient(135deg, #FBF8F4 0%, #EFE6DA 100%)",
    cardBorder: "#DDD3C7",
    tagBg: "transparent",
    tagColor: "#A8483A",
    tagBorder: "#A8483A",
  },
  silver: {
    name: "Silver",
    badgeLabel: "SILVER",
    cardGradient: "linear-gradient(135deg, #EEE9E3 0%, #DDD6CD 100%)",
    cardBorder: "#C9C0B5",
    tagBg: "transparent",
    tagColor: "#2B2420",
    tagBorder: "#8A7E72",
  },
  gold: {
    name: "Gold",
    badgeLabel: "GOLD",
    cardGradient: "linear-gradient(135deg, #F3E6CC 0%, #E3CFA2 100%)",
    cardBorder: "#D6BF8E",
    tagBg: "rgba(245, 236, 219, 0.6)",
    tagColor: "#4A3B18",
    tagBorder: "#B89B5F",
  },
  admin: {
    name: "Admin",
    badgeLabel: "ADMIN",
    cardGradient: "linear-gradient(135deg, #FBF8F4 0%, #EFE6DA 100%)",
    cardBorder: "#DDD3C7",
    tagBg: "transparent",
    tagColor: "#A8483A",
    tagBorder: "#A8483A",
  },
  specialist: {
    name: "Specialist",
    badgeLabel: "SPECIALIST",
    cardGradient: "linear-gradient(135deg, #FBF8F4 0%, #EFE6DA 100%)",
    cardBorder: "#DDD3C7",
    tagBg: "transparent",
    tagColor: "#A8483A",
    tagBorder: "#A8483A",
  },
};

/**
 * 7 flat polygons (triangles and quads) tiling the card diagonally,
 * creating the signature diamond-cut facet pattern (Adamas = diamond).
 */
export function MembershipCardFacets() {
  return (
    <svg
      className="absolute inset-0 w-full h-full pointer-events-none select-none"
      viewBox="0 0 366 232"
      preserveAspectRatio="none"
      aria-hidden="true"
    >
      {/* 1. 0,0 140,0 60,110 fill #A8483A at 7% opacity */}
      <polygon
        points="0,0 140,0 60,110"
        fill="#A8483A"
        fillOpacity="0.07"
        stroke="#A8483A"
        strokeOpacity="0.16"
        strokeWidth="0.8"
        vectorEffect="non-scaling-stroke"
      />
      {/* 2. 140,0 260,0 200,100 fill #CDB9A6 at 22% opacity */}
      <polygon
        points="140,0 260,0 200,100"
        fill="#CDB9A6"
        fillOpacity="0.22"
        stroke="#A8483A"
        strokeOpacity="0.16"
        strokeWidth="0.8"
        vectorEffect="non-scaling-stroke"
      />
      {/* 3. 260,0 366,0 366,120 300,90 fill #A8483A at 10% opacity */}
      <polygon
        points="260,0 366,0 366,120 300,90"
        fill="#A8483A"
        fillOpacity="0.10"
        stroke="#A8483A"
        strokeOpacity="0.16"
        strokeWidth="0.8"
        vectorEffect="non-scaling-stroke"
      />
      {/* 4. 0,0 60,110 0,232 fill #CDB9A6 at 20% opacity */}
      <polygon
        points="0,0 60,110 0,232"
        fill="#CDB9A6"
        fillOpacity="0.20"
        stroke="#A8483A"
        strokeOpacity="0.16"
        strokeWidth="0.8"
        vectorEffect="non-scaling-stroke"
      />
      {/* 5. 60,110 200,100 150,232 0,232 fill #A8483A at 5% opacity */}
      <polygon
        points="60,110 200,100 150,232 0,232"
        fill="#A8483A"
        fillOpacity="0.05"
        stroke="#A8483A"
        strokeOpacity="0.16"
        strokeWidth="0.8"
        vectorEffect="non-scaling-stroke"
      />
      {/* 6. 200,100 300,90 366,120 366,232 250,232 fill #A8483A at 9% opacity */}
      <polygon
        points="200,100 300,90 366,120 366,232 250,232"
        fill="#A8483A"
        fillOpacity="0.09"
        stroke="#A8483A"
        strokeOpacity="0.16"
        strokeWidth="0.8"
        vectorEffect="non-scaling-stroke"
      />
      {/* 7. 150,232 250,232 200,100 fill #2B2420 at 5% opacity */}
      <polygon
        points="150,232 250,232 200,100"
        fill="#2B2420"
        fillOpacity="0.05"
        stroke="#A8483A"
        strokeOpacity="0.16"
        strokeWidth="0.8"
        vectorEffect="non-scaling-stroke"
      />
    </svg>
  );
}

/**
 * 1D Barcode SVG matching authentic high-end charge / membership cards.
 */
export function MembershipCardBarcode({ className }: { className?: string }) {
  const barsPattern = [
    2, 1, 1, 2, 3, 1, 1, 2, 2, 1, 1, 3, 2, 1, 2, 2, 1, 1, 3, 1, 2, 1, 1, 2,
    3, 2, 1, 1, 2, 2, 1, 3, 1, 2, 1, 1, 2, 3, 1, 2, 2, 1, 1, 2, 3, 1, 1, 2,
    2, 1, 1, 3, 2, 1, 2, 2, 1, 1, 3, 1, 2, 1, 1, 2, 3, 2, 1, 1, 2, 2, 1, 3,
    1, 2, 1, 1, 2, 3, 1, 2, 2, 1, 1, 2, 3, 1, 1, 2, 2, 1, 1, 3, 2, 1, 2, 2,
  ];

  let currentX = 2;
  const bars: React.ReactNode[] = [];

  for (let i = 0; i < barsPattern.length; i++) {
    const width = barsPattern[i];
    if (i % 2 === 0) {
      bars.push(
        <rect
          key={i}
          x={currentX}
          y="0"
          width={width}
          height="32"
          fill="#2B2420"
        />
      );
    }
    currentX += width;
  }

  return (
    <svg
      viewBox={`0 0 ${currentX + 2} 32`}
      className={className}
      preserveAspectRatio="none"
      aria-hidden="true"
    >
      {bars}
    </svg>
  );
}

export interface MembershipCardProps {
  name?: string | null;
  role?: string | null;
  tier?: MembershipTier;
  memberId?: string | null;
  userId?: string | null;
  loyaltyPoints?: number | null;
  createdAt?: string | null;
  memberSince?: string | null;
  interactive?: boolean;
  showActions?: boolean;
  adminTagFilled?: boolean;
  className?: string;
  onFlipChange?: (flipped: boolean) => void;
  onClick?: () => void;
  onShine?: () => void;
}

export function MembershipCard({
  name = "Dev Admin",
  role,
  tier,
  memberId,
  userId,
  loyaltyPoints = 0,
  createdAt,
  memberSince,
  interactive = true,
  showActions = true,
  adminTagFilled = false,
  className,
  onFlipChange,
  onClick,
  onShine,
}: MembershipCardProps) {
  const [glareKey, setGlareKey] = useState(0);
  const [isGlaring, setIsGlaring] = useState(false);
  const [prefersReducedMotion, setPrefersReducedMotion] = useState(false);

  useEffect(() => {
    if (typeof window !== "undefined") {
      const mediaQuery = window.matchMedia("(prefers-reduced-motion: reduce)");
      setPrefersReducedMotion(mediaQuery.matches);
      const listener = (e: MediaQueryListEvent) => setPrefersReducedMotion(e.matches);
      mediaQuery.addEventListener("change", listener);
      return () => mediaQuery.removeEventListener("change", listener);
    }
  }, []);

  // Determine active tier
  const resolvedTier: MembershipTier = (() => {
    if (tier && TIER_CONFIGS[tier]) return tier;
    const r = (role || "").toLowerCase().trim();
    if (r === "admin") return "admin";
    if (r === "employee") return "specialist";
    return "member";
  })();

  const tierConfig = TIER_CONFIGS[resolvedTier];

  const displayName = name?.trim() ? name.trim() : "Member";
  const displayMemberId = memberId?.trim() || formatMemberId(userId, createdAt);
  const displayMemberSince = memberSince?.trim() || formatMemberSinceShort(createdAt);
  const pointsFormatted = formatLoyaltyPoints(loyaltyPoints);

  const triggerShine = () => {
    if (!interactive) return;
    setGlareKey((prev) => prev + 1);
    setIsGlaring(true);
    onClick?.();
    onShine?.();
    onFlipChange?.(false);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (!interactive) return;
    if (e.key === "Enter" || e.key === " ") {
      e.preventDefault();
      triggerShine();
    }
  };

  const ariaLabel = `Adamas Care membership card, ${displayName}, ${displayMemberSince}, ${pointsFormatted} loyalty points. Tier: ${tierConfig.badgeLabel}.`;

  return (
    <div className={cn("w-full max-w-full md:max-w-[420px] flex flex-col", className)}>
      {/* ── CARD ELEMENT CONTAINER ── */}
      <div className="w-full [container-type:inline-size]">
        <div
          role={interactive ? "button" : "img"}
          tabIndex={interactive ? 0 : undefined}
          aria-label={
            interactive
              ? `${ariaLabel} Click or press Enter to shine.`
              : ariaLabel
          }
          onClick={triggerShine}
          onKeyDown={handleKeyDown}
          className={cn(
            "group relative w-full aspect-[1.58/1] select-none rounded-[22px] overflow-hidden border border-[#DDD3C7] shadow-[0_14px_34px_rgba(60,40,25,0.12)] p-[clamp(18px,5.5cqw,24px)] flex flex-col justify-between outline-none transition-transform duration-200",
            interactive &&
              "cursor-pointer focus-visible:ring-2 focus-visible:ring-[#2B2420] focus-visible:ring-offset-2 active:scale-[0.985]"
          )}
          style={{
            background: tierConfig.cardGradient,
          }}
        >
          {/* Diamond-cut Facet Artwork */}
          <MembershipCardFacets />

          {/* Ambient Subtle Shimmer Layer on hover */}
          <div
            className="pointer-events-none absolute inset-0 overflow-hidden rounded-[22px]"
            aria-hidden="true"
          >
            <div
              className="absolute -inset-[150%] opacity-0 group-hover:opacity-100 transition-opacity duration-700 animate-facet-shimmer pointer-events-none"
              style={{
                background:
                  "linear-gradient(115deg, transparent 40%, rgba(255,255,255,0.5) 50%, transparent 60%)",
              }}
            />
          </div>

          {/* Active Click / Tap Glare & Shine Beam */}
          {isGlaring && !prefersReducedMotion && (
            <div
              key={glareKey}
              onAnimationEnd={() => setIsGlaring(false)}
              className="pointer-events-none absolute -inset-[150%] z-20 animate-card-glare"
              style={{
                background:
                  "linear-gradient(115deg, transparent 32%, rgba(255,255,255,0.18) 42%, rgba(255,255,255,0.88) 50%, rgba(255,255,255,0.18) 58%, transparent 68%)",
              }}
              aria-hidden="true"
            />
          )}

          {/* ROW 1: Wordmark & Tier Badge */}
          <div className="relative z-10 flex items-start justify-between">
            <div>
              <div
                className="font-serif font-medium leading-none text-[#2B2420] tracking-[0.16em]"
                style={{
                  fontSize: "clamp(20px, 6.5cqw, 24px)",
                  letterSpacing: "0.16em",
                }}
              >
                ADAMAS
              </div>
              <div
                className="font-inter text-[9px] text-[#2B2420] uppercase mt-1 leading-none font-normal tracking-[0.5em]"
                style={{
                  letterSpacing: "0.5em",
                }}
              >
                CARE
              </div>
            </div>

            {/* Role/Tier Tag */}
            <span
              className={cn(
                "rounded-full px-[11px] py-[5px] text-[10px] font-medium font-inter uppercase leading-none tracking-[0.26em] transition-colors",
                adminTagFilled && resolvedTier === "admin"
                  ? "bg-[#A8483A] text-[#FBF8F4] border-transparent"
                  : "border"
              )}
              style={{
                letterSpacing: "0.26em",
                borderWidth: "1px",
                borderColor:
                  adminTagFilled && resolvedTier === "admin"
                    ? "transparent"
                    : tierConfig.tagBorder,
                color:
                  adminTagFilled && resolvedTier === "admin"
                    ? "#FBF8F4"
                    : tierConfig.tagColor,
                backgroundColor:
                  adminTagFilled && resolvedTier === "admin"
                    ? "#A8483A"
                    : tierConfig.tagBg,
              }}
            >
              {tierConfig.badgeLabel}
            </span>
          </div>

          {/* ROW 2: Member ID */}
          <div className="relative z-10 my-auto py-1">
            <p
              className="font-inter font-medium text-[#2B2420] tabular-nums select-all leading-none"
              style={{
                fontSize: "clamp(13px, 4cqw, 15px)",
                letterSpacing: "0.22em",
              }}
            >
              {displayMemberId}
            </p>
          </div>

          {/* ROW 3: Member Name, Date & Points */}
          <div className="relative z-10 flex items-end justify-between gap-3 min-w-0">
            <div className="min-w-0 max-w-[70%]">
              <p
                className="font-serif font-medium leading-tight text-[#2B2420] line-clamp-2 break-words"
                style={{
                  fontSize: "clamp(22px, 7.5cqw, 28px)",
                  letterSpacing: "0.02em",
                }}
                title={displayName}
              >
                {displayName}
              </p>
              <p
                className="font-inter text-[11px] text-[#6B5C50] mt-1 leading-none"
                style={{
                  letterSpacing: "0.06em",
                }}
              >
                {displayMemberSince}
              </p>
            </div>

            <div className="shrink-0 text-right">
              <p
                className="font-inter text-[9px] text-[#6B5C50] uppercase leading-none"
                style={{
                  letterSpacing: "0.24em",
                }}
              >
                POINTS
              </p>
              <p
                className="font-serif font-medium text-[#A8483A] mt-1 leading-none text-right"
                style={{
                  fontSize: "clamp(22px, 7cqw, 26px)",
                }}
              >
                {pointsFormatted}
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* ── ACTION BUTTONS BELOW THE CARD ── */}
      {showActions && (
        <div className="flex flex-col gap-3 w-full mt-3">
          <Link
            href="/booking"
            className="w-full h-[52px] min-h-[52px] rounded-[16px] bg-[#A5523A] hover:bg-[#91452F] active:scale-[0.99] text-white font-medium text-sm flex items-center justify-center gap-2.5 transition-all shadow-xs focus:outline-none focus-visible:ring-2 focus-visible:ring-[#A5523A] focus-visible:ring-offset-2"
          >
            <Calendar className="w-5 h-5 text-white/90" />
            <span>Book a Treatment</span>
          </Link>
          <Link
            href="/account/loyalty?tab=rewards"
            className="w-full h-[52px] min-h-[52px] rounded-[16px] border border-[#CFC4B6] bg-transparent hover:bg-white/60 active:scale-[0.99] text-[#2B2420] font-medium text-sm flex items-center justify-center gap-2.5 transition-all focus:outline-none focus-visible:ring-2 focus-visible:ring-[#A5523A] focus-visible:ring-offset-2"
          >
            <Gift className="w-5 h-5 text-[#2B2420]/80" />
            <span>View Rewards</span>
          </Link>
        </div>
      )}
    </div>
  );
}

export function MembershipCardSkeleton() {
  return (
    <div
      className="w-full max-w-full md:max-w-[420px] flex flex-col gap-3 animate-pulse"
      aria-hidden="true"
    >
      <div className="w-full aspect-[1.58/1] rounded-[22px] bg-[#EFE6DA] border border-[#DDD3C7] p-6 flex flex-col justify-between">
        <div className="flex justify-between items-center">
          <div className="h-6 w-24 bg-[#E2D6C5] rounded" />
          <div className="h-5 w-16 bg-[#E2D6C5] rounded-full" />
        </div>
        <div className="h-5 w-40 bg-[#E2D6C5] rounded" />
        <div className="flex justify-between items-end">
          <div className="space-y-2">
            <div className="h-7 w-32 bg-[#E2D6C5] rounded" />
            <div className="h-4 w-24 bg-[#E2D6C5] rounded" />
          </div>
          <div className="space-y-1 text-right">
            <div className="h-3 w-12 bg-[#E2D6C5] rounded ml-auto" />
            <div className="h-7 w-10 bg-[#E2D6C5] rounded ml-auto" />
          </div>
        </div>
      </div>
      <div className="w-full h-[52px] rounded-[16px] bg-[#EFE6DA]" />
      <div className="w-full h-[52px] rounded-[16px] bg-[#EFE6DA]" />
    </div>
  );
}
