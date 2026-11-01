import { describe, it, expect } from "vitest";
import fs from "fs";
import path from "path";
import { GENDERS, GENDER_VALUES, isValidGender } from "@/lib/gender";

describe("Gender Model & Selector Specifications (lib/gender-selector.test.ts)", () => {
  it("exports exactly the three standard gender options with matching symbols", () => {
    expect(GENDERS).toEqual([
      { value: "female", label: "Female", symbol: "♀" },
      { value: "male", label: "Male", symbol: "♂" },
      { value: "other", label: "Other", symbol: "⚧" },
    ]);
    expect(GENDER_VALUES).toEqual(["female", "male", "other"]);
  });

  it("validates gender values correctly via isValidGender", () => {
    expect(isValidGender("female")).toBe(true);
    expect(isValidGender("male")).toBe(true);
    expect(isValidGender("other")).toBe(true);
    expect(isValidGender("unknown")).toBe(false);
    expect(isValidGender("")).toBe(false);
    expect(isValidGender(null)).toBe(false);
  });

  describe("GenderSelector component static contract verification", () => {
    const componentCode = fs.readFileSync(
      path.resolve("components/ui/GenderSelector.tsx"),
      "utf8"
    );

    it("draws inline SVGs for all three symbols rather than raw text characters", () => {
      // Must contain inline SVG declarations with viewBox
      expect(componentCode).toContain('viewBox="0 0 24 24"');

      // Female symbol SVG geometry (Venus ♀: circle at top, cross at bottom)
      expect(componentCode).toContain('<circle cx="12" cy="8.5" r="5" />');
      expect(componentCode).toContain('<line x1="12" y1="13.5" x2="12" y2="21" />');
      expect(componentCode).toContain('<line x1="8.5" y1="17.5" x2="15.5" y2="17.5" />');

      // Male symbol SVG geometry (Mars ♂: circle lower-left, northeast arrow)
      expect(componentCode).toContain('<circle cx="9.5" cy="14.5" r="5" />');
      expect(componentCode).toContain('<line x1="13" y1="11" x2="19.5" y2="4.5" />');
      expect(componentCode).toContain('<polyline points="14.5 4.5 19.5 4.5 19.5 9.5" />');

      // Other symbol SVG geometry (Transgender ⚧: center circle, bottom cross, diagonal arrows)
      expect(componentCode).toContain('<circle cx="12" cy="12" r="4.2" />');
      expect(componentCode).toContain('<line x1="12" y1="16.2" x2="12" y2="21.5" />');
      expect(componentCode).toContain('<line x1="15" y1="9" x2="19.5" y2="4.5" />');
      expect(componentCode).toContain('<line x1="9" y1="9" x2="4.5" y2="4.5" />');
    });

    it("marks SVG icons as decorative with aria-hidden='true'", () => {
      expect(componentCode).toContain('aria-hidden="true"');
    });

    it("uses brand colors: accent #C97B5C when selected, muted beige #8C7A6B when unselected", () => {
      expect(componentCode).toContain("#C97B5C");
      expect(componentCode).toContain("#8C7A6B");
    });

    it("enforces WCAG 44px+ tap target sizing and equal card heights", () => {
      expect(componentCode).toContain("min-h-[84px]");
      expect(componentCode).toContain("grid-cols-3");
    });

    it("implements hidden-but-real radio inputs and radiogroup semantics", () => {
      expect(componentCode).toContain('role="radiogroup"');
      expect(componentCode).toContain('type="radio"');
      expect(componentCode).toContain('className="sr-only"');
    });

    it("includes check badge, focus visible ring, and respects reduced motion", () => {
      // Check badge
      expect(componentCode).toContain("<CheckBadge />");
      expect(componentCode).toContain('polyline points="2.5 6 5 8.5 9.5 3.5"');

      // Focus visible ring
      expect(componentCode).toContain("focus-within:ring-2");
      expect(componentCode).toContain("focus-within:ring-[#C97B5C]");

      // Prefers-reduced-motion
      expect(componentCode).toContain("motion-reduce:transition-none");
    });
  });
});
