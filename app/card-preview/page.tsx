"use client";

import React, { useState } from "react";
import {
  MembershipCard,
  type MembershipTier,
} from "@/components/cards/MembershipCard";

export default function CardPreviewPage() {
  const [tier, setTier] = useState<MembershipTier>("admin");
  const [userName, setUserName] = useState("Dev Admin");
  const [memberId, setMemberId] = useState("AC26 0001 8842");
  const [loyaltyPoints, setLoyaltyPoints] = useState(0);
  const [memberSince, setMemberSince] = useState("Member since 10/26");
  const [previewWidth, setPreviewWidth] = useState<number | "100%">("100%");
  const [isFlipped, setIsFlipped] = useState(false);
  const [showButtons, setShowButtons] = useState(true);

  return (
    <div className="min-h-screen bg-[#F4EFE8] p-4 sm:p-8 flex flex-col items-center">
      {/* Control Header */}
      <header className="w-full max-w-5xl mb-8 bg-[#FBF8F4] rounded-2xl border border-[#DDD3C7] p-5 shadow-xs flex flex-wrap items-center justify-between gap-4">
        <div>
          <span className="text-xs uppercase tracking-[0.24em] font-medium text-[#A8483A] block">
            Adamas Care • Luxury Loyalty
          </span>
          <h1 className="text-xl font-serif font-semibold text-[#2B2420]">
            Membership Card Component — Ivory Faceted Gem
          </h1>
        </div>

        {/* Tier switcher buttons */}
        <div className="flex flex-wrap items-center gap-2">
          <span className="text-xs text-[#6B5C50] font-medium mr-1">Tiers:</span>
          {(["member", "silver", "gold", "admin", "specialist"] as MembershipTier[]).map(
            (t) => (
              <button
                key={t}
                type="button"
                onClick={() => setTier(t)}
                className={`px-3 py-1.5 text-xs uppercase font-medium rounded-lg border transition-colors ${
                  tier === t
                    ? "bg-[#2B2420] text-[#F4EFE8] border-[#2B2420]"
                    : "bg-white text-[#6B5C50] border-[#DDD3C7] hover:border-[#A8483A]"
                }`}
              >
                {t}
              </button>
            )
          )}
        </div>

        {/* Width Switcher */}
        <div className="flex items-center gap-1.5 bg-[#EFE6DA] p-1 rounded-xl border border-[#DDD3C7]">
          <button
            type="button"
            onClick={() => setPreviewWidth(320)}
            className={`px-2.5 py-1 text-xs font-medium rounded-lg transition-colors ${
              previewWidth === 320
                ? "bg-[#2B2420] text-white"
                : "text-[#6B5C50] hover:text-[#2B2420]"
            }`}
          >
            320px
          </button>
          <button
            type="button"
            onClick={() => setPreviewWidth(366)}
            className={`px-2.5 py-1 text-xs font-medium rounded-lg transition-colors ${
              previewWidth === 366
                ? "bg-[#2B2420] text-white"
                : "text-[#6B5C50] hover:text-[#2B2420]"
            }`}
          >
            366px (Ref)
          </button>
          <button
            type="button"
            onClick={() => setPreviewWidth(420)}
            className={`px-2.5 py-1 text-xs font-medium rounded-lg transition-colors ${
              previewWidth === 420
                ? "bg-[#2B2420] text-white"
                : "text-[#6B5C50] hover:text-[#2B2420]"
            }`}
          >
            420px (Desktop)
          </button>
          <button
            type="button"
            onClick={() => setPreviewWidth("100%")}
            className={`px-2.5 py-1 text-xs font-medium rounded-lg transition-colors ${
              previewWidth === "100%"
                ? "bg-[#2B2420] text-white"
                : "text-[#6B5C50] hover:text-[#2B2420]"
            }`}
          >
            Auto Fluid
          </button>
        </div>
      </header>

      {/* Main Preview Stage */}
      <main className="w-full max-w-5xl flex flex-col lg:flex-row items-center lg:items-start justify-center gap-10">
        {/* Card Stage with background separation */}
        <div className="flex flex-col items-center w-full max-w-full md:max-w-md">
          <div
            className="w-full flex justify-center p-3 sm:p-6 md:p-8 rounded-[28px] bg-[#E8DED1]/70 border border-[#DDD3C7]/80 shadow-xs transition-all duration-300"
            style={{
              maxWidth: previewWidth === "100%" ? "100%" : `${previewWidth}px`,
            }}
          >
            <MembershipCard
              name={userName}
              tier={tier}
              memberId={memberId}
              loyaltyPoints={loyaltyPoints}
              memberSince={memberSince}
              interactive={true}
              showActions={showButtons}
              onFlipChange={(f) => setIsFlipped(f)}
            />
          </div>

          <p className="text-xs text-[#6B5C50] mt-3 text-center">
            💡 {isFlipped ? "Card flipped (Showing check-in QR code)." : "Click the card or press Enter/Space to flip for reception check-in code."}
          </p>
        </div>

        {/* Live Controls Panel */}
        <div className="w-full max-w-md bg-white rounded-2xl border border-[#DDD3C7] p-6 shadow-xs space-y-4">
          <h2 className="text-sm font-semibold uppercase tracking-[0.16em] text-[#2B2420]">
            Customize Card Data
          </h2>

          <div>
            <label className="text-xs font-medium text-[#6B5C50] block mb-1">
              Member Name
            </label>
            <input
              type="text"
              value={userName}
              onChange={(e) => setUserName(e.target.value)}
              className="w-full px-3 py-2 text-sm rounded-xl border border-[#DDD3C7] bg-[#FBF8F4] text-[#2B2420] focus:outline-none focus:border-[#A8483A]"
            />
          </div>

          <div>
            <label className="text-xs font-medium text-[#6B5C50] block mb-1">
              Member ID
            </label>
            <input
              type="text"
              value={memberId}
              onChange={(e) => setMemberId(e.target.value)}
              className="w-full px-3 py-2 text-sm font-mono rounded-xl border border-[#DDD3C7] bg-[#FBF8F4] text-[#2B2420] focus:outline-none focus:border-[#A8483A]"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs font-medium text-[#6B5C50] block mb-1">
                Points Balance
              </label>
              <input
                type="number"
                value={loyaltyPoints}
                onChange={(e) => setLoyaltyPoints(Number(e.target.value) || 0)}
                className="w-full px-3 py-2 text-sm rounded-xl border border-[#DDD3C7] bg-[#FBF8F4] text-[#2B2420] focus:outline-none focus:border-[#A8483A]"
              />
            </div>

            <div>
              <label className="text-xs font-medium text-[#6B5C50] block mb-1">
                Member Since
              </label>
              <input
                type="text"
                value={memberSince}
                onChange={(e) => setMemberSince(e.target.value)}
                className="w-full px-3 py-2 text-sm rounded-xl border border-[#DDD3C7] bg-[#FBF8F4] text-[#2B2420] focus:outline-none focus:border-[#A8483A]"
              />
            </div>
          </div>

          <div className="pt-2 flex items-center justify-between border-t border-[#DDD3C7]">
            <span className="text-xs font-medium text-[#2B2420]">
              Action Buttons Below Card
            </span>
            <input
              type="checkbox"
              checked={showButtons}
              onChange={(e) => setShowButtons(e.target.checked)}
              className="accent-[#A8483A] w-4 h-4 cursor-pointer"
            />
          </div>
        </div>
      </main>
    </div>
  );
}
