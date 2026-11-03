"use client";

import React from "react";

export interface StudentDevelopersProps {
  backgroundColor?: string;
  headlineColor?: string;
  developer1?: {
    firstName?: string;
    lastName?: string;
    role?: string;
    imageUrl?: string;
  };
  developer2?: {
    firstName?: string;
    lastName?: string;
    role?: string;
    imageUrl?: string;
  };
  /** Force a specific layout preview mode, or 'fluid' for normal responsive behavior */
  viewportMode?: "fluid" | "desktop" | "tablet" | "phone";
}

export function SilhouettePlaceholder({
  roundedClass = "",
  className = "",
}: {
  roundedClass?: string;
  className?: string;
}) {
  return (
    <div
      className={`relative w-full h-full bg-[#222222] overflow-hidden flex items-end justify-center select-none ${roundedClass} ${className}`}
    >
      <svg
        viewBox="0 0 400 500"
        className="w-full h-full block"
        preserveAspectRatio="xMidYMid slice"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
      >
        <rect width="400" height="500" fill="#222222" />
        {/* Head Silhouette */}
        <circle cx="200" cy="185" r="76" fill="#474747" />
        {/* Shoulders / Torso Silhouette */}
        <path
          d="M 60 500 C 60 365, 105 295, 200 295 C 295 295, 340 365, 340 500 Z"
          fill="#474747"
        />
      </svg>
    </div>
  );
}

export default function StudentDevelopersView({
  backgroundColor = "#B01E22",
  headlineColor = "#BFE9F2",
  developer1 = {
    firstName: "Spandan",
    lastName: "Dhar",
    role: "Project Architect",
    imageUrl: "https://res.cloudinary.com/vetwmuuk/image/upload/f_auto/q_auto/Grayscale_Portrait_of_a_Smiling_Young_Man.png",
  },
  developer2 = {
    firstName: "Sampad",
    lastName: "Ghosh",
    role: "Development Associate",
    imageUrl: "https://res.cloudinary.com/vetwmuuk/image/upload/f_auto/q_auto/Confident_Monochrome_Portrait_with_Glasses.png",
  },
  viewportMode = "fluid",
}: StudentDevelopersProps) {
  if (viewportMode === "desktop") {
    return (
      <div
        className="w-[1280px] h-[800px] flex flex-col justify-between overflow-hidden relative"
        style={{
          backgroundColor,
          fontFamily: "'Inter Tight', -apple-system, BlinkMacSystemFont, sans-serif",
        }}
      >
        <DesktopLayout
          headlineColor={headlineColor}
          dev1={developer1}
          dev2={developer2}
        />
      </div>
    );
  }

  if (viewportMode === "tablet") {
    return (
      <div
        className="w-[768px] h-[1024px] flex flex-col justify-between overflow-hidden relative"
        style={{
          backgroundColor,
          fontFamily: "'Inter Tight', -apple-system, BlinkMacSystemFont, sans-serif",
        }}
      >
        <TabletLayout
          headlineColor={headlineColor}
          dev1={developer1}
          dev2={developer2}
        />
      </div>
    );
  }

  if (viewportMode === "phone") {
    return (
      <div
        className="w-[390px] min-h-[844px] flex flex-col justify-between overflow-y-auto relative"
        style={{
          backgroundColor,
          fontFamily: "'Inter Tight', -apple-system, BlinkMacSystemFont, sans-serif",
        }}
      >
        <PhoneLayout
          headlineColor={headlineColor}
          dev1={developer1}
          dev2={developer2}
        />
      </div>
    );
  }

  // Fluid responsive mode adapts across breakpoints:
  // <768px -> Phone layout (scrolls vertically)
  // 768px - 1024px -> Tablet layout (fits 1 screen, no scroll)
  // >=1024px -> Desktop layout (fits 1 screen, no scroll)
  return (
    <div
      className="w-full h-full text-white relative flex flex-col justify-between md:overflow-hidden"
      style={{
        backgroundColor,
        fontFamily: "'Inter Tight', -apple-system, BlinkMacSystemFont, sans-serif",
      }}
    >
      {/* Phone layout on mobile screens (<768px) */}
      <div className="block md:hidden w-full min-h-screen overflow-y-auto">
        <PhoneLayout
          headlineColor={headlineColor}
          dev1={developer1}
          dev2={developer2}
        />
      </div>

      {/* Tablet layout on intermediate md screens (768px - 1024px) */}
      <div className="hidden md:block lg:hidden w-full h-screen overflow-hidden">
        <TabletLayout
          headlineColor={headlineColor}
          dev1={developer1}
          dev2={developer2}
        />
      </div>

      {/* Desktop layout on large screens (>=1024px) */}
      <div className="hidden lg:flex w-full h-screen overflow-hidden flex-col justify-between">
        <DesktopLayout
          headlineColor={headlineColor}
          dev1={developer1}
          dev2={developer2}
        />
      </div>
    </div>
  );
}

/** Desktop Layout (1280x800 specification: fits exactly 1 screen, zero overflow) */
function DesktopLayout({
  headlineColor,
  dev1,
  dev2,
}: {
  headlineColor: string;
  dev1: NonNullable<StudentDevelopersProps["developer1"]>;
  dev2: NonNullable<StudentDevelopersProps["developer2"]>;
}) {
  return (
    <div className="w-full h-screen overflow-hidden flex flex-col justify-between pt-6 px-10 xl:px-14 pb-0 select-none">
      {/* Top Section - always visible and locked to top */}
      <div className="w-full flex justify-between items-start flex-shrink-0">
        {/* Top-left: Adamas University stacked label */}
        <div className="text-white font-extrabold text-[14px] leading-[1.08] tracking-tight uppercase">
          ADAMAS
          <br />
          UNIVERSITY
        </div>

        {/* Top-right: Title block ~62% width */}
        <div className="w-[62%] flex flex-col items-start">
          <div className="text-white font-extrabold text-[22px] xl:text-[26px] tracking-tight uppercase leading-none">
            MEET THE STUDENT
          </div>
          <h1
            className="font-black lowercase text-left select-none mt-0.5"
            style={{
              color: headlineColor,
              letterSpacing: "-0.045em",
              lineHeight: 0.86,
              fontSize: "clamp(68px, 8.5vw, 120px)",
            }}
          >
            developers
          </h1>
        </div>
      </div>

      {/* Bottom Section: Two equal columns side by side with 16px gap, extending flush to bottom edge */}
      <div className="w-full flex-1 min-h-0 flex flex-col justify-end mt-4">
        <div className="grid grid-cols-2 gap-4 h-full min-h-0 items-end">
          {/* Column 1: Developer 1 */}
          <div className="flex flex-col h-full min-h-0 justify-end">
            <div className="mb-2 flex-shrink-0">
              <h2 className="text-white font-extrabold text-[26px] xl:text-[30px] leading-[1.04] tracking-tight">
                {dev1.firstName}
                <br />
                {dev1.lastName}
              </h2>
              <p className="text-white font-medium text-[13px] xl:text-[14px] leading-snug mt-0.5">
                {dev1.role}
              </p>
            </div>
            {/* Photo Container: stretches cleanly to bottom edge with rounded top corners */}
            <div className="w-full flex-1 min-h-0 rounded-t-[18px] rounded-b-none overflow-hidden bg-[#222222]">
              {dev1.imageUrl ? (
                <img
                  src={dev1.imageUrl}
                  alt={`${dev1.firstName} ${dev1.lastName}`}
                  className="w-full h-full object-cover object-center rounded-t-[18px] grayscale contrast-[1.05]"
                  style={{ width: "100%", height: "100%", objectFit: "cover" }}
                />
              ) : (
                <SilhouettePlaceholder roundedClass="rounded-t-[18px] rounded-b-none" />
              )}
            </div>
          </div>

          {/* Column 2: Developer 2 */}
          <div className="flex flex-col h-full min-h-0 justify-end">
            <div className="mb-2 flex-shrink-0">
              <h2 className="text-white font-extrabold text-[26px] xl:text-[30px] leading-[1.04] tracking-tight">
                {dev2.firstName}
                <br />
                {dev2.lastName}
              </h2>
              <p className="text-white font-medium text-[13px] xl:text-[14px] leading-snug mt-0.5">
                {dev2.role}
              </p>
            </div>
            {/* Photo Container: stretches cleanly to bottom edge with rounded top corners */}
            <div className="w-full flex-1 min-h-0 rounded-t-[18px] rounded-b-none overflow-hidden bg-[#222222]">
              {dev2.imageUrl ? (
                <img
                  src={dev2.imageUrl}
                  alt={`${dev2.firstName} ${dev2.lastName}`}
                  className="w-full h-full object-cover object-center rounded-t-[18px] grayscale contrast-[1.05]"
                  style={{ width: "100%", height: "100%", objectFit: "cover" }}
                />
              ) : (
                <SilhouettePlaceholder roundedClass="rounded-t-[18px] rounded-b-none" />
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

/** Tablet Layout (768x1024 specification: fits exactly 1 screen, zero overflow) */
function TabletLayout({
  headlineColor,
  dev1,
  dev2,
}: {
  headlineColor: string;
  dev1: NonNullable<StudentDevelopersProps["developer1"]>;
  dev2: NonNullable<StudentDevelopersProps["developer2"]>;
}) {
  return (
    <div className="w-full h-screen overflow-hidden flex flex-col justify-between pt-6 px-8 pb-0 select-none">
      {/* Top Section */}
      <div className="w-full flex justify-between items-start flex-shrink-0">
        {/* Top-left: Adamas University stacked label */}
        <div className="text-white font-extrabold text-[13px] leading-[1.08] tracking-tight uppercase">
          ADAMAS
          <br />
          UNIVERSITY
        </div>

        {/* Top-right: Title block ~64% width */}
        <div className="w-[64%] flex flex-col items-start">
          <div className="text-white font-extrabold text-[20px] tracking-tight uppercase leading-none">
            MEET THE STUDENT
          </div>
          <h1
            className="font-black lowercase text-left select-none mt-0.5"
            style={{
              color: headlineColor,
              letterSpacing: "-0.045em",
              lineHeight: 0.86,
              fontSize: "clamp(54px, 8.5vw, 84px)",
            }}
          >
            developers
          </h1>
        </div>
      </div>

      {/* Bottom Section: Two equal columns side by side with 16px gap, extending flush to bottom edge */}
      <div className="w-full flex-1 min-h-0 flex flex-col justify-end mt-4">
        <div className="grid grid-cols-2 gap-4 h-full min-h-0 items-end">
          {/* Column 1 */}
          <div className="flex flex-col h-full min-h-0 justify-end">
            <div className="mb-2 flex-shrink-0">
              <h2 className="text-white font-extrabold text-[22px] leading-[1.04] tracking-tight">
                {dev1.firstName}
                <br />
                {dev1.lastName}
              </h2>
              <p className="text-white font-medium text-[13px] leading-snug mt-0.5">
                {dev1.role}
              </p>
            </div>
            <div className="w-full flex-1 min-h-0 rounded-t-[18px] rounded-b-none overflow-hidden bg-[#222222]">
              {dev1.imageUrl ? (
                <img
                  src={dev1.imageUrl}
                  alt={`${dev1.firstName} ${dev1.lastName}`}
                  className="w-full h-full object-cover object-center rounded-t-[18px] grayscale contrast-[1.05]"
                  style={{ width: "100%", height: "100%", objectFit: "cover" }}
                />
              ) : (
                <SilhouettePlaceholder roundedClass="rounded-t-[18px] rounded-b-none" />
              )}
            </div>
          </div>

          {/* Column 2 */}
          <div className="flex flex-col h-full min-h-0 justify-end">
            <div className="mb-2 flex-shrink-0">
              <h2 className="text-white font-extrabold text-[22px] leading-[1.04] tracking-tight">
                {dev2.firstName}
                <br />
                {dev2.lastName}
              </h2>
              <p className="text-white font-medium text-[13px] leading-snug mt-0.5">
                {dev2.role}
              </p>
            </div>
            <div className="w-full flex-1 min-h-0 rounded-t-[18px] rounded-b-none overflow-hidden bg-[#222222]">
              {dev2.imageUrl ? (
                <img
                  src={dev2.imageUrl}
                  alt={`${dev2.firstName} ${dev2.lastName}`}
                  className="w-full h-full object-cover object-center rounded-t-[18px] grayscale contrast-[1.05]"
                  style={{ width: "100%", height: "100%", objectFit: "cover" }}
                />
              ) : (
                <SilhouettePlaceholder roundedClass="rounded-t-[18px] rounded-b-none" />
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

/** Phone Layout (390px specification: vertical scrolling) */
function PhoneLayout({
  headlineColor,
  dev1,
  dev2,
}: {
  headlineColor: string;
  dev1: NonNullable<StudentDevelopersProps["developer1"]>;
  dev2: NonNullable<StudentDevelopersProps["developer2"]>;
}) {
  return (
    <div className="w-full min-h-screen px-6 pt-7 pb-0 select-none flex flex-col justify-between">
      {/* Top Section */}
      <div>
        {/* Label: ADAMAS UNIVERSITY */}
        <div className="text-white font-extrabold text-[14px] leading-[1.1] tracking-tight uppercase">
          ADAMAS
          <br />
          UNIVERSITY
        </div>

        {/* Small Heading: MEET THE STUDENT */}
        <div className="text-white font-extrabold text-[22px] tracking-tight uppercase mt-6 leading-none">
          MEET THE STUDENT
        </div>

        {/* Huge Headline: developers */}
        <h1
          className="font-black lowercase select-none mt-1"
          style={{
            color: headlineColor,
            letterSpacing: "-0.045em",
            lineHeight: 0.86,
            fontSize: "clamp(54px, 18vw, 84px)",
          }}
        >
          developers
        </h1>

        {/* Developer 1 Card */}
        <div className="mt-7">
          <div className="flex items-end justify-between mb-2.5">
            <h2 className="text-white font-extrabold text-[28px] leading-[1.04] tracking-tight">
              {dev1.firstName}
              <br />
              {dev1.lastName}
            </h2>
            <span className="text-white font-medium text-[14px] pb-1">
              {dev1.role}
            </span>
          </div>
          {/* Image container: rounded corners (18px) */}
          <div className="w-full h-[340px] rounded-[18px] overflow-hidden bg-[#222222]">
            {dev1.imageUrl ? (
              <img
                src={dev1.imageUrl}
                alt={`${dev1.firstName} ${dev1.lastName}`}
                className="w-full h-full object-cover object-center rounded-[18px] grayscale contrast-[1.05]"
                style={{ width: "100%", height: "100%", objectFit: "cover" }}
              />
            ) : (
              <SilhouettePlaceholder roundedClass="rounded-[18px]" />
            )}
          </div>
        </div>
      </div>

      {/* Developer 2 Card (32px gap, photo runs to bottom edge with top-only rounded corners) */}
      <div className="mt-8">
        <div className="flex items-end justify-between mb-2.5">
          <h2 className="text-white font-extrabold text-[28px] leading-[1.04] tracking-tight">
            {dev2.firstName}
            <br />
            {dev2.lastName}
          </h2>
          <span className="text-white font-medium text-[14px] pb-1">
            {dev2.role}
          </span>
        </div>
        {/* Image container: top rounded corners (18px), flush to bottom */}
        <div className="w-full h-[340px] rounded-t-[18px] rounded-b-none overflow-hidden bg-[#222222]">
          {dev2.imageUrl ? (
            <img
              src={dev2.imageUrl}
              alt={`${dev2.firstName} ${dev2.lastName}`}
              className="w-full h-full object-cover object-center rounded-t-[18px] grayscale contrast-[1.05]"
              style={{ width: "100%", height: "100%", objectFit: "cover" }}
            />
          ) : (
            <SilhouettePlaceholder roundedClass="rounded-t-[18px] rounded-b-none" />
          )}
        </div>
      </div>
    </div>
  );
}
