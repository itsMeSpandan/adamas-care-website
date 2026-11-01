"use client";

import React, { useState } from "react";
import AuthExperience, { type AuthMode } from "@/components/auth/AuthExperience";

type PreviewWidth = 1280 | 768 | 390 | 360 | "100%";

export default function AuthPreviewPage() {
  const [selectedWidth, setSelectedWidth] = useState<PreviewWidth>(1280);
  const [selectedMode, setSelectedMode] = useState<AuthMode>("signin");

  return (
    <div className="min-h-screen bg-[#EDE7DF] p-4 sm:p-6 flex flex-col items-center">
      {/* Top Review Controls Bar */}
      <header className="w-full max-w-6xl mb-6 bg-white rounded-2xl border border-[#DDD3C7] p-4 shadow-xs flex flex-wrap items-center justify-between gap-4">
        <div>
          <span className="text-xs uppercase tracking-[0.2em] font-medium text-[#A8483A] block">
            Adamas Care Design Review
          </span>
          <h1 className="text-lg font-serif font-semibold text-[#2B2420]">
            Sign In / Sign Up Responsive Review
          </h1>
        </div>

        {/* Width Switchers */}
        <div className="flex items-center gap-1.5 bg-[#F4EFE8] p-1 rounded-xl border border-[#DDD3C7]">
          <button
            type="button"
            onClick={() => setSelectedWidth(1280)}
            className={`px-3 py-1.5 text-xs font-medium rounded-lg transition-colors ${
              selectedWidth === 1280
                ? "bg-[#2B2420] text-white shadow-xs"
                : "text-[#6B5C50] hover:text-[#2B2420]"
            }`}
          >
            Desktop (1280px)
          </button>
          <button
            type="button"
            onClick={() => setSelectedWidth(768)}
            className={`px-3 py-1.5 text-xs font-medium rounded-lg transition-colors ${
              selectedWidth === 768
                ? "bg-[#2B2420] text-white shadow-xs"
                : "text-[#6B5C50] hover:text-[#2B2420]"
            }`}
          >
            Tablet (768px)
          </button>
          <button
            type="button"
            onClick={() => setSelectedWidth(390)}
            className={`px-3 py-1.5 text-xs font-medium rounded-lg transition-colors ${
              selectedWidth === 390
                ? "bg-[#2B2420] text-white shadow-xs"
                : "text-[#6B5C50] hover:text-[#2B2420]"
            }`}
          >
            Phone (390px)
          </button>
          <button
            type="button"
            onClick={() => setSelectedWidth(360)}
            className={`px-3 py-1.5 text-xs font-medium rounded-lg transition-colors ${
              selectedWidth === 360
                ? "bg-[#2B2420] text-white shadow-xs"
                : "text-[#6B5C50] hover:text-[#2B2420]"
            }`}
          >
            Small (360px)
          </button>
          <button
            type="button"
            onClick={() => setSelectedWidth("100%")}
            className={`px-3 py-1.5 text-xs font-medium rounded-lg transition-colors ${
              selectedWidth === "100%"
                ? "bg-[#2B2420] text-white shadow-xs"
                : "text-[#6B5C50] hover:text-[#2B2420]"
            }`}
          >
            Fluid (100%)
          </button>
        </div>

        {/* State / Mode Switchers */}
        <div className="flex items-center gap-1.5 bg-[#F4EFE8] p-1 rounded-xl border border-[#DDD3C7]">
          <button
            type="button"
            onClick={() => setSelectedMode("signin")}
            className={`px-3.5 py-1.5 text-xs font-medium rounded-lg transition-colors ${
              selectedMode === "signin"
                ? "bg-[#A8483A] text-white shadow-xs"
                : "text-[#6B5C50] hover:text-[#2B2420]"
            }`}
          >
            Sign In State
          </button>
          <button
            type="button"
            onClick={() => setSelectedMode("signup")}
            className={`px-3.5 py-1.5 text-xs font-medium rounded-lg transition-colors ${
              selectedMode === "signup"
                ? "bg-[#A8483A] text-white shadow-xs"
                : "text-[#6B5C50] hover:text-[#2B2420]"
            }`}
          >
            Sign Up State
          </button>
        </div>
      </header>

      {/* Preview Device Frame */}
      <div
        className="w-full flex justify-center items-start transition-all duration-300"
        style={{
          maxWidth: selectedWidth === "100%" ? "100%" : `${selectedWidth}px`,
        }}
      >
        <div
          className={`w-full bg-[#F4EFE8] rounded-3xl overflow-hidden border border-[#DDD3C7] shadow-xl ${
            selectedWidth === 390 || selectedWidth === 360
              ? "ring-12 ring-[#2B2420]/10"
              : ""
          }`}
        >
          <AuthExperience
            mode={selectedMode}
            onModeChange={setSelectedMode}
            containerWidth={selectedWidth === "100%" ? undefined : selectedWidth}
          />
        </div>
      </div>
    </div>
  );
}
