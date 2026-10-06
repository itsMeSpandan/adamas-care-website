"use client";

/**
 * CountryCodeSelect — flag + dial-code dropdown used next to every phone
 * number input (signup, profile, post-Google-sign-in prompt).
 *
 * Controlled: `value` is the dial code WITH "+", `onChange` receives the new
 * dial code. The national digits stay in the parent's state; parents compose
 * the two with composePhoneNumber() before validating/saving.
 *
 * The popover is rendered with position:fixed and measured off the trigger,
 * because every host modal card uses overflow-hidden (rounded corners), which
 * would clip an absolutely-positioned dropdown. It flips upward when there is
 * not enough room below.
 *
 * Keyboard: Enter/Space opens, ArrowUp/ArrowDown move the highlight, Enter
 * selects, Escape closes. A text filter at the top matches country name,
 * ISO code, and dial code.
 */

import { useEffect, useLayoutEffect, useRef, useState } from "react";
import {
  COUNTRIES,
  DEFAULT_COUNTRY,
  flagUrl,
  searchCountries,
  type CountryOption,
} from "@/lib/countries";

interface CountryCodeSelectProps {
  /** Current dial code WITH "+", e.g. "+91". */
  value: string;
  onChange: (dial: string) => void;
  /** Optional id for label association. */
  id?: string;
  disabled?: boolean;
  /** Accessible name; defaults to "Country dial code". */
  ariaLabel?: string;
  className?: string;
}

const PANEL_WIDTH = 280;
const PANEL_MAX_HEIGHT = 300;

export default function CountryCodeSelect({
  value,
  onChange,
  id,
  disabled = false,
  ariaLabel = "Country dial code",
  className = "",
}: CountryCodeSelectProps) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [activeIndex, setActiveIndex] = useState(0);
  const [panelStyle, setPanelStyle] = useState<React.CSSProperties>({});

  const containerRef = useRef<HTMLDivElement>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const searchRef = useRef<HTMLInputElement>(null);
  const listRef = useRef<HTMLDivElement>(null);

  const selected =
    COUNTRIES.find((c) => `+${c.dial}` === value) ?? DEFAULT_COUNTRY;
  const results = searchCountries(query);

  /** Position the fixed popover against the trigger, flipping if clipped. */
  const positionPanel = () => {
    const trigger = triggerRef.current;
    if (!trigger) return;
    const rect = trigger.getBoundingClientRect();
    // Trigger not rendered (mid-animation / display:none) — keep last style.
    if (rect.width === 0 || rect.height === 0) return;

    const spaceBelow = window.innerHeight - rect.bottom;
    const spaceAbove = rect.top;
    const openUp =
      spaceBelow < PANEL_MAX_HEIGHT + 16 && spaceAbove > spaceBelow;

    // Clamp to a usable height whatever the viewport does — a transiently
    // tiny/huge innerHeight must never produce a negative or absurd value.
    const available = openUp ? spaceAbove - 16 : spaceBelow - 16;
    const maxHeight = Math.max(120, Math.min(PANEL_MAX_HEIGHT, available));

    const left = Math.min(
      Math.max(8, rect.left),
      Math.max(8, window.innerWidth - PANEL_WIDTH - 8),
    );

    setPanelStyle(
      openUp
        ? { position: "fixed", left, bottom: window.innerHeight - rect.top + 8, width: PANEL_WIDTH, maxHeight }
        : { position: "fixed", left, top: rect.bottom + 8, width: PANEL_WIDTH, maxHeight },
    );
  };

  useLayoutEffect(() => {
    if (open) positionPanel();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  // Close on outside click / Escape; reposition on scroll & resize.
  useEffect(() => {
    if (!open) return;

    const onPointerDown = (e: MouseEvent) => {
      if (containerRef.current?.contains(e.target as Node)) return;
      setOpen(false);
    };
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpen(false);
    };
    const onReposition = () => positionPanel();

    document.addEventListener("mousedown", onPointerDown);
    document.addEventListener("keydown", onKeyDown);
    window.addEventListener("resize", onReposition);
    window.addEventListener("scroll", onReposition, true);
    // The trigger's rect can be measured while the viewport/layout is still
    // settling (panel resize, route transition) — keep re-anchoring while the
    // dropdown is open so it can never stay stranded off-screen.
    const reanchor = setInterval(positionPanel, 250);
    return () => {
      document.removeEventListener("mousedown", onPointerDown);
      document.removeEventListener("keydown", onKeyDown);
      window.removeEventListener("resize", onReposition);
      window.removeEventListener("scroll", onReposition, true);
      clearInterval(reanchor);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  // Focus the filter when the panel opens; reset it when it closes.
  useEffect(() => {
    if (open) {
      setQuery("");
      setActiveIndex(0);
      // rAF: the panel must exist before focusing.
      requestAnimationFrame(() => searchRef.current?.focus());
    }
  }, [open]);

  // Keep the highlighted row visible while arrowing through the list.
  useEffect(() => {
    if (!open) return;
    const list = listRef.current;
    const row = list?.children[activeIndex] as HTMLElement | undefined;
    row?.scrollIntoView({ block: "nearest" });
  }, [activeIndex, open]);

  const select = (country: CountryOption) => {
    onChange(`+${country.dial}`);
    setOpen(false);
    triggerRef.current?.focus();
  };

  const handleSearchKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "ArrowDown") {
      e.preventDefault();
      setActiveIndex((i) => Math.min(i + 1, results.length - 1));
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setActiveIndex((i) => Math.max(i - 1, 0));
    } else if (e.key === "Enter") {
      e.preventDefault();
      const country = results[activeIndex];
      if (country) select(country);
    }
  };

  return (
    <div ref={containerRef} className={`relative ${className}`}>
      <button
        ref={triggerRef}
        id={id}
        type="button"
        disabled={disabled}
        aria-haspopup="listbox"
        aria-expanded={open}
        aria-label={ariaLabel}
        onClick={() => setOpen((o) => !o)}
        onKeyDown={(e) => {
          if (e.key === "ArrowDown" || e.key === "Enter" || e.key === " ") {
            if (!open && e.key === "ArrowDown") {
              e.preventDefault();
              setOpen(true);
            }
          }
        }}
        className="flex h-full items-center gap-1.5 rounded-xl border border-beige-300 bg-beige-50 px-2.5 py-3 text-sm text-beige-800 transition-colors hover:border-beige-400 focus:border-beige-500 focus:outline-none focus:ring-2 focus:ring-beige-200 disabled:cursor-not-allowed disabled:opacity-60"
      >
        <img
          src={flagUrl(selected.code)}
          alt=""
          width={20}
          height={15}
          loading="lazy"
          className="h-[15px] w-5 shrink-0 rounded-[2px] object-cover"
        />
        <span className="font-medium tabular-nums">+{selected.dial}</span>
        <svg
          width="12"
          height="12"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2.5"
          strokeLinecap="round"
          strokeLinejoin="round"
          className="shrink-0 text-beige-400"
          aria-hidden="true"
        >
          <polyline points="6 9 12 15 18 9" />
        </svg>
      </button>

      {open && (
        <div
          role="listbox"
          aria-label={ariaLabel}
          style={panelStyle}
          className="z-[10002] overflow-hidden rounded-xl border border-beige-200 bg-white shadow-xl"
        >
          <div className="border-b border-beige-100 p-2">
            <input
              ref={searchRef}
              type="text"
              value={query}
              onChange={(e) => {
                setQuery(e.target.value);
                setActiveIndex(0);
              }}
              onKeyDown={handleSearchKeyDown}
              placeholder="Search country or code…"
              className="w-full rounded-lg border border-beige-200 bg-beige-50 px-3 py-2 text-sm text-beige-800 placeholder:text-beige-400 focus:border-beige-500 focus:bg-white focus:outline-none"
            />
          </div>
          <div ref={listRef} className="overflow-y-auto py-1">
            {results.length === 0 && (
              <p className="px-3 py-4 text-center text-sm text-beige-400">
                No country found
              </p>
            )}
            {results.map((country, index) => {
              const isSelected = country.code === selected.code;
              return (
                <button
                  key={country.code}
                  type="button"
                  role="option"
                  aria-selected={isSelected}
                  onClick={() => select(country)}
                  onMouseEnter={() => setActiveIndex(index)}
                  className={`flex w-full items-center gap-2.5 px-3 py-2 text-left text-sm transition-colors ${
                    index === activeIndex ? "bg-beige-100" : "bg-white"
                  } ${isSelected ? "font-semibold text-beige-700" : "text-beige-600"}`}
                >
                  <img
                    src={flagUrl(country.code)}
                    alt=""
                    width={20}
                    height={15}
                    loading="lazy"
                    className="h-[15px] w-5 shrink-0 rounded-[2px] object-cover"
                  />
                  <span className="min-w-0 flex-1 truncate">{country.name}</span>
                  <span className="shrink-0 tabular-nums text-beige-400">
                    +{country.dial}
                  </span>
                </button>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
