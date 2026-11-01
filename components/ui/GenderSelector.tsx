"use client";

import React, { useId } from "react";
import { GENDERS, type Gender } from "@/lib/gender";

export type GenderValue = "" | Gender;

export interface GenderSelectorProps {
  value: string;
  onChange: (value: Gender) => void;
  name?: string;
  label?: string;
  disabled?: boolean;
  className?: string;
  required?: boolean;
  id?: string;
}

/** Inline SVG for Female (Venus ♀) symbol */
function FemaleSymbol({ className }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2.2"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
      aria-hidden="true"
    >
      <circle cx="12" cy="8.5" r="5" />
      <line x1="12" y1="13.5" x2="12" y2="21" />
      <line x1="8.5" y1="17.5" x2="15.5" y2="17.5" />
    </svg>
  );
}

/** Inline SVG for Male (Mars ♂) symbol */
function MaleSymbol({ className }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2.2"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
      aria-hidden="true"
    >
      <circle cx="9.5" cy="14.5" r="5" />
      <line x1="13" y1="11" x2="19.5" y2="4.5" />
      <polyline points="14.5 4.5 19.5 4.5 19.5 9.5" />
    </svg>
  );
}

/** Inline SVG for Other (Transgender ⚧) symbol */
function OtherSymbol({ className }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2.2"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
      aria-hidden="true"
    >
      {/* Center circle */}
      <circle cx="12" cy="12" r="4.2" />
      {/* Bottom female cross */}
      <line x1="12" y1="16.2" x2="12" y2="21.5" />
      <line x1="9.5" y1="19" x2="14.5" y2="19" />
      {/* Top-right male arrow */}
      <line x1="15" y1="9" x2="19.5" y2="4.5" />
      <polyline points="15.5 4.5 19.5 4.5 19.5 8.5" />
      {/* Top-left transgender arrow with crossbar */}
      <line x1="9" y1="9" x2="4.5" y2="4.5" />
      <polyline points="8.5 4.5 4.5 4.5 4.5 8.5" />
      <line x1="5.2" y1="8.2" x2="8.2" y2="5.2" />
    </svg>
  );
}

/** Check badge indicating selection in top-right corner */
function CheckBadge() {
  return (
    <span
      className="absolute top-1.5 right-1.5 sm:top-2 sm:right-2 flex h-4 w-4 sm:h-4.5 sm:w-4.5 items-center justify-center rounded-full bg-[#C97B5C] text-white shadow-xs"
      aria-hidden="true"
    >
      <svg
        viewBox="0 0 12 12"
        fill="none"
        stroke="currentColor"
        strokeWidth="2.5"
        strokeLinecap="round"
        strokeLinejoin="round"
        className="h-2.5 w-2.5 sm:h-3 sm:w-3"
      >
        <polyline points="2.5 6 5 8.5 9.5 3.5" />
      </svg>
    </span>
  );
}

const GENDER_ICONS: Record<Gender, React.ComponentType<{ className?: string }>> = {
  female: FemaleSymbol,
  male: MaleSymbol,
  other: OtherSymbol,
};

export default function GenderSelector({
  value,
  onChange,
  name,
  label = "Gender",
  disabled = false,
  className = "",
  required = false,
  id,
}: GenderSelectorProps) {
  const generatedId = useId();
  const radioGroupName = name || `gender-${generatedId}`;
  const groupId = id || `gender-group-${generatedId}`;

  return (
    <fieldset
      id={groupId}
      role="radiogroup"
      aria-label={label}
      aria-required={required}
      disabled={disabled}
      className={`border-0 p-0 m-0 ${className}`}
    >
      {label && <legend className="sr-only">{label}</legend>}
      <div className="grid grid-cols-3 gap-2 sm:gap-3">
        {GENDERS.map((option) => {
          const isSelected = value === option.value;
          const IconComponent = GENDER_ICONS[option.value];
          const inputId = `${radioGroupName}-${option.value}`;

          return (
            <label
              key={option.value}
              htmlFor={inputId}
              className={`relative flex flex-1 flex-col items-center justify-center min-h-[84px] sm:min-h-[92px] px-2 py-3 sm:py-3.5 rounded-xl cursor-pointer select-none border text-center transition-all duration-150 motion-reduce:transition-none focus-within:ring-2 focus-within:ring-[#C97B5C] focus-within:ring-offset-2 ${
                disabled
                  ? "opacity-50 cursor-not-allowed pointer-events-none"
                  : ""
              } ${
                isSelected
                  ? "border-[#C97B5C] bg-[#C97B5C]/10 text-beige-800 shadow-xs"
                  : "border-beige-300 bg-white hover:border-beige-400 hover:bg-beige-50/60 text-beige-600"
              }`}
            >
              {/* Hidden real radio input for form accessibility */}
              <input
                type="radio"
                id={inputId}
                name={radioGroupName}
                value={option.value}
                checked={isSelected}
                disabled={disabled}
                required={required}
                onChange={() => onChange(option.value)}
                className="sr-only"
              />

              {/* Selected badge */}
              {isSelected && <CheckBadge />}

              {/* Inline SVG Gender Symbol (28-32px) */}
              <div
                className={`transition-colors duration-150 motion-reduce:transition-none mb-1.5 sm:mb-2 ${
                  isSelected ? "text-[#C97B5C]" : "text-[#8C7A6B]"
                }`}
              >
                <IconComponent className="w-7 h-7 sm:w-8 sm:h-8" />
              </div>

              {/* Accessible text label */}
              <span
                className={`text-xs sm:text-sm font-medium transition-colors duration-150 motion-reduce:transition-none ${
                  isSelected
                    ? "font-semibold text-beige-800"
                    : "text-beige-600"
                }`}
              >
                {option.label}
              </span>
            </label>
          );
        })}
      </div>
    </fieldset>
  );
}
