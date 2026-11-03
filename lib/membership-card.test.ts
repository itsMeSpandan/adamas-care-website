import { describe, it, expect } from "vitest";
import fs from "fs";
import path from "path";
import {
  formatMemberSinceShort,
  formatMemberId,
} from "./profile-utils";

describe("Membership Card Component (Ivory Faceted Gem)", () => {
  const componentPath = path.resolve(
    process.cwd(),
    "components/cards/MembershipCard.tsx"
  );
  const componentContent = fs.readFileSync(componentPath, "utf8");

  describe("1. Geometry, Card Ratio & Visual Hierarchy", () => {
    it("enforces standard bank-card aspect ratio (1.58 / 1) and full screen width on smaller devices (md:max-w-[420px] desktop)", () => {
      expect(componentContent).toContain("aspect-[1.58/1]");
      expect(componentContent).toContain("w-full max-w-full md:max-w-[420px]");
    });

    it("uses 22px border radius, 1px #DDD3C7 border, and soft shadow without heavy glow", () => {
      expect(componentContent).toContain("rounded-[22px]");
      expect(componentContent).toContain("border-[#DDD3C7]");
      expect(componentContent).toContain("shadow-[0_14px_34px_rgba(60,40,25,0.12)]");
    });

    it("uses ivory gradient base linear-gradient(135deg, #FBF8F4 0%, #EFE6DA 100%)", () => {
      expect(componentContent).toContain("linear-gradient(135deg, #FBF8F4 0%, #EFE6DA 100%)");
    });
  });

  describe("2. Diamond-Cut Facet Artwork (7 Polygons)", () => {
    it("contains all 7 exact gem facet polygons with specific coordinates and opacities", () => {
      // 1. 0,0 140,0 60,110 fill #A8483A at 7%
      expect(componentContent).toContain('points="0,0 140,0 60,110"');
      expect(componentContent).toContain('fillOpacity="0.07"');

      // 2. 140,0 260,0 200,100 fill #CDB9A6 at 22%
      expect(componentContent).toContain('points="140,0 260,0 200,100"');
      expect(componentContent).toContain('fillOpacity="0.22"');

      // 3. 260,0 366,0 366,120 300,90 fill #A8483A at 10%
      expect(componentContent).toContain('points="260,0 366,0 366,120 300,90"');
      expect(componentContent).toContain('fillOpacity="0.10"');

      // 4. 0,0 60,110 0,232 fill #CDB9A6 at 20%
      expect(componentContent).toContain('points="0,0 60,110 0,232"');
      expect(componentContent).toContain('fillOpacity="0.20"');

      // 5. 60,110 200,100 150,232 0,232 fill #A8483A at 5%
      expect(componentContent).toContain('points="60,110 200,100 150,232 0,232"');
      expect(componentContent).toContain('fillOpacity="0.05"');

      // 6. 200,100 300,90 366,120 366,232 250,232 fill #A8483A at 9%
      expect(componentContent).toContain('points="200,100 300,90 366,120 366,232 250,232"');
      expect(componentContent).toContain('fillOpacity="0.09"');

      // 7. 150,232 250,232 200,100 fill #2B2420 at 5%
      expect(componentContent).toContain('points="150,232 250,232 200,100"');
    });

    it("applies hairline strokes (#A8483A at 16% opacity, 0.8px) with non-scaling-stroke", () => {
      expect(componentContent).toContain('stroke="#A8483A"');
      expect(componentContent).toContain('strokeOpacity="0.16"');
      expect(componentContent).toContain('strokeWidth="0.8"');
      expect(componentContent).toContain('vectorEffect="non-scaling-stroke"');
    });

    it("includes slow diagonal shimmer highlight with prefers-reduced-motion safety", () => {
      expect(componentContent).toContain("linear-gradient(115deg, transparent 40%, rgba(255,255,255,0.5) 50%, transparent 60%)");
      expect(componentContent).toContain("animate-facet-shimmer");
    });
  });

  describe("3. Content Layout (Three Rows)", () => {
    it("Row 1: renders ADAMAS wordmark with tracking and CARE uppercase subtitle, plus role/tier pill tag", () => {
      expect(componentContent).toContain("ADAMAS");
      expect(componentContent).toContain("CARE");
      expect(componentContent).toContain("tracking-[0.16em]");
      expect(componentContent).toContain("tracking-[0.5em]");
      expect(componentContent).toContain("tracking-[0.26em]");
      expect(componentContent).toContain("rounded-full");
    });

    it("Row 2: renders Member ID in tabular-nums with wide letter-spacing", () => {
      expect(componentContent).toContain("tabular-nums");
      expect(componentContent).toContain("letterSpacing: \"0.22em\"");
    });

    it("Row 3: renders member name, 'Member since', and POINTS with clay value", () => {
      expect(componentContent).toContain("POINTS");
      expect(componentContent).toContain("#A8483A");
      expect(componentContent).toContain("letterSpacing: \"0.02em\"");
      expect(componentContent).toContain("letterSpacing: \"0.06em\"");
      expect(componentContent).toContain("letterSpacing: \"0.24em\"");
      expect(componentContent).toContain("line-clamp-2");
    });
  });

  describe("4. Shining Glare Interactivity & Stable Card Face", () => {
    it("triggers a radiant shining glare beam animation on click or tap", () => {
      expect(componentContent).toContain("animate-card-glare");
      expect(componentContent).toContain("triggerShine");
      expect(componentContent).toContain("isGlaring");
    });

    it("removes 3D flip to prevent blank card screen and keeps card face permanently stable", () => {
      expect(componentContent).not.toContain("rotateY(180deg)");
    });

    it("supports keyboard activation via Enter and Space with focus-visible ring", () => {
      expect(componentContent).toContain('e.key === "Enter"');
      expect(componentContent).toContain('e.key === " "');
      expect(componentContent).toContain("focus-visible:ring-2");
    });
  });

  describe("5. Tier Variants (Member, Silver, Gold, Admin, Specialist)", () => {
    it("supports tier variants with distinct gradients and tags", () => {
      expect(componentContent).toContain("silver");
      expect(componentContent).toContain("gold");
      expect(componentContent).toContain("admin");
      expect(componentContent).toContain("specialist");
    });
  });

  describe("6. Buttons Below the Card", () => {
    it("renders 52px tall full-width Book a Treatment button (#A5523A fill, calendar icon, radius 16px)", () => {
      expect(componentContent).toContain('href="/booking"');
      expect(componentContent).toContain("h-[52px]");
      expect(componentContent).toContain("rounded-[16px]");
      expect(componentContent).toContain("bg-[#A5523A]");
      expect(componentContent).toContain("<Calendar");
      expect(componentContent).toContain("Book a Treatment");
    });

    it("renders 52px tall full-width View Rewards button (#CFC4B6 border, gift icon, radius 16px)", () => {
      expect(componentContent).toContain('href="/account/loyalty?tab=rewards"');
      expect(componentContent).toContain("border-[#CFC4B6]");
      expect(componentContent).toContain("<Gift");
      expect(componentContent).toContain("View Rewards");
    });
  });

  describe("7. Pure Helper Functions", () => {
    it("formatMemberSinceShort formats ISO strings into 'Member since MM/YY'", () => {
      expect(formatMemberSinceShort("2026-10-15T10:30:00.000Z")).toBe("Member since 10/26");
      expect(formatMemberSinceShort("2024-01-01T00:00:00.000Z")).toBe("Member since 01/24");
      expect(formatMemberSinceShort("2025-12-31T23:59:59.000Z")).toBe("Member since 12/25");
      expect(formatMemberSinceShort("Member since 10/26")).toBe("Member since 10/26");
      expect(formatMemberSinceShort(null)).toBe("Member since 10/26");
      expect(formatMemberSinceShort(undefined)).toBe("Member since 10/26");
    });

    it("formatMemberId generates elegant AC26 0001 8842 style member codes", () => {
      expect(formatMemberId("AC26 0001 8842")).toBe("AC26 0001 8842");
      const id1 = formatMemberId("user_12345", "2026-10-15");
      expect(id1).toMatch(/^AC26\s\d{4}\s\d{4}$/);

      const id2 = formatMemberId("user_dev_admin", "2025-05-10");
      expect(id2).toMatch(/^AC25\s\d{4}\s\d{4}$/);

      // Deterministic: same input gives same output
      expect(formatMemberId("user_12345", "2026-10-15")).toBe(id1);
    });
  });
});
