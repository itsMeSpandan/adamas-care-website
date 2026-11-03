import { describe, it, expect } from "vitest";
import fs from "fs";
import path from "path";

describe("Logged-in Home Hero Specifications (< 768px vs >= 768px)", () => {
  const componentPath = path.resolve(process.cwd(), "components/sections/LoggedInHome.tsx");
  const carouselPath = path.resolve(process.cwd(), "components/ui/HeroCarousel.tsx");
  const controlPath = path.resolve(process.cwd(), "components/ui/DashboardBackgroundControl.tsx");

  const componentContent = fs.readFileSync(componentPath, "utf8");
  const carouselContent = fs.readFileSync(carouselPath, "utf8");
  const controlContent = fs.readFileSync(controlPath, "utf8");

  describe("1. Document Flow & Layout Isolation", () => {
    it("uses flex-col normal document flow on mobile (< 768px) and preserves split layout on desktop (>= 768px)", () => {
      expect(componentContent).toContain("flex flex-col w-full");
      expect(componentContent).toContain("md:relative");
      expect(componentContent).toContain("md:flex-row md:items-center md:min-h-[calc(100vh-88px)]");
    });

    it("has text block with unified background and mobile padding", () => {
      expect(componentContent).toContain("var(--bg-primary)");
      expect(componentContent).toContain("px-5 pt-6 pb-4");
      expect(componentContent).toContain("md:bg-transparent md:p-0 md:relative md:z-10 md:max-w-3xl");
    });

    it("applies smooth fade gradient overlay on mobile matching public hero", () => {
      expect(componentContent).toContain("linear-gradient(to bottom, var(--bg-primary)");
    });

    it("renders the photo carousel below the text on mobile filling to bottom of screen", () => {
      expect(componentContent).toContain("relative w-full flex-1 min-h-0 overflow-hidden");
      expect(componentContent).toContain("md:aspect-auto md:max-h-none md:absolute md:inset-y-0 md:right-0 md:w-[45%]");
    });
  });

  describe("2. Typography, Contrast & Content Hierarchy", () => {
    it("renders time-based eyebrow with unified accent-primary token", () => {
      expect(componentContent).toContain("var(--accent-primary)");
      expect(componentContent).toContain("tracking-[0.24em]");
      expect(componentContent).toContain("greeting.greeting.toUpperCase()");
    });

    it("uses a single <h1> for the user's name in Cormorant Garamond with unified text-primary token", () => {
      expect(componentContent).toContain("<motion.h1");
      expect(componentContent).toContain("var(--text-primary)");
      expect(componentContent).toContain("break-words");
    });

    it("renders subtitle with unified text-muted token", () => {
      expect(componentContent).toContain("var(--text-muted)");
      expect(componentContent).toContain("{greeting.subline}");
    });

    it("renders stats row using semantic <dl> (<dt>=label, <dd>=value) with border-color token", () => {
      expect(componentContent).toContain("<motion.dl");
      expect(componentContent).toContain("var(--border-color)");
      expect(componentContent).toContain("MEMBER SINCE");
      expect(componentContent).toContain("LOYALTY POINTS");
      expect(componentContent).toContain("<dt");
      expect(componentContent).toContain("<dd");
    });
  });

  describe("3. Buttons Row", () => {
    it("styles primary 'Book a Treatment' button with unified accent-primary, white text", () => {
      expect(componentContent).toContain('href="/booking"');
      expect(componentContent).toContain("var(--accent-primary)");
      expect(componentContent).toContain("rounded-full");
      expect(componentContent).toContain("Book a Treatment");
      expect(componentContent).toContain("<CalendarCheck");
    });

    it("styles secondary 'View Rewards' button with border-color, text-primary, and transparent background", () => {
      expect(componentContent).toContain('href="/account/loyalty?tab=rewards"');
      expect(componentContent).toContain("var(--border-color)");
      expect(componentContent).toContain("var(--text-primary)");
      expect(componentContent).toContain("rounded-full");
      expect(componentContent).toContain("View Rewards");
      expect(componentContent).toContain("<Gift");
    });

    it("stacks buttons full-width on <= 360px narrow screens", () => {
      expect(componentContent).toContain("max-[360px]:flex-col max-[360px]:w-full");
    });
  });

  describe("4. Carousel & Dashboard Control Adaptations", () => {
    it("centers pagination dots at bottom inside translucent dark pill (rgba(42,33,28,0.45)) with cream active dot", () => {
      expect(carouselContent).toContain("bg-[rgba(42,33,28,0.45)] px-3 py-1.5 backdrop-blur-sm");
      expect(carouselContent).toContain('#F4EFE8');
      expect(carouselContent).toContain("rgba(244, 239, 232, 0.6)");
    });

    it("moves 'Fallback background' chip to bottom-left corner on mobile (11px, dark translucent, cream text)", () => {
      expect(controlContent).toContain("bottom-4 left-4 z-20 md:bottom-auto md:left-auto md:right-8 md:top-32 md:z-30");
      expect(controlContent).toContain("bg-[rgba(42,33,28,0.65)] px-2.5 py-1 text-[11px] font-medium text-[#F4EFE8]");
    });
  });
});
