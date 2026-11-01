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
      expect(componentContent).toContain("flex flex-col w-full bg-[#F4EFE8]");
      expect(componentContent).toContain("md:relative md:flex-row md:items-center md:min-h-[calc(100vh-88px)]");
      expect(componentContent).toContain("md:overflow-hidden md:bg-beige-50");
    });

    it("has text block with solid cream background and exact padding (20px sides, 24px top/bottom, 16px on <= 360px)", () => {
      expect(componentContent).toContain("bg-[#F4EFE8]");
      expect(componentContent).toContain("px-5 pt-6 pb-6 max-[360px]:px-4 max-[360px]:py-5");
      expect(componentContent).toContain("md:bg-transparent md:p-0 md:relative md:z-10 md:max-w-3xl");
    });

    it("places a 1px full-width divider between the text block and the carousel on mobile", () => {
      expect(componentContent).toContain('<div className="w-full h-px bg-[#DDD3C7] md:hidden" aria-hidden="true" />');
    });

    it("renders the photo carousel below the text on mobile with aspect-ratio and no rounded page edges", () => {
      expect(componentContent).toContain("relative w-full aspect-[3/4] max-h-[380px] overflow-hidden");
      expect(componentContent).toContain("md:aspect-auto md:max-h-none md:absolute md:inset-y-0 md:right-0 md:w-[45%]");
    });
  });

  describe("2. Typography, Contrast & Content Hierarchy", () => {
    it("renders time-based eyebrow in clay-coral #A8483A with thin leading line", () => {
      expect(componentContent).toContain("bg-[#A8483A]");
      expect(componentContent).toContain("tracking-[0.24em]");
      expect(componentContent).toContain("text-[#A8483A]");
      expect(componentContent).toContain("greeting.greeting.toUpperCase()");
    });

    it("uses a single <h1> for the user's name in Cormorant Garamond medium espresso #2B2420 with clamp sizing", () => {
      expect(componentContent).toContain("<motion.h1");
      expect(componentContent).toContain("text-[clamp(2rem,8vw,2.6rem)]");
      expect(componentContent).toContain("text-[#2B2420]");
      expect(componentContent).toContain("break-words");
    });

    it("renders subtitle in Inter 15px/1.7 in #5B4E45", () => {
      expect(componentContent).toContain("text-[15px] leading-[1.7] text-[#5B4E45]");
      expect(componentContent).toContain("{greeting.subline}");
    });

    it("renders stats row using semantic <dl> (<dt>=label, <dd>=value) with 1px #DDD3C7 divider above on mobile", () => {
      expect(componentContent).toContain("<motion.dl");
      expect(componentContent).toContain("border-t border-[#DDD3C7] pt-4 grid grid-cols-2 gap-4");
      expect(componentContent).toContain("MEMBER SINCE");
      expect(componentContent).toContain("LOYALTY POINTS");
      expect(componentContent).toContain("<dt");
      expect(componentContent).toContain("<dd");
    });
  });

  describe("3. Buttons Row", () => {
    it("styles primary 'Book a Treatment' button as pill with #A8483A fill, white text, and 44px min height", () => {
      expect(componentContent).toContain('href="/booking"');
      expect(componentContent).toContain("bg-[#A8483A]");
      expect(componentContent).toContain("rounded-full");
      expect(componentContent).toContain("min-h-[44px]");
      expect(componentContent).toContain("Book a Treatment");
      expect(componentContent).toContain("<CalendarCheck");
    });

    it("styles secondary 'View Rewards' button as pill with cream #FBF8F4 fill, 1px #DDD3C7 border, espresso text, and 44px min height", () => {
      expect(componentContent).toContain('href="/account/loyalty?tab=rewards"');
      expect(componentContent).toContain("bg-[#FBF8F4]");
      expect(componentContent).toContain("border-[#DDD3C7]");
      expect(componentContent).toContain("text-[#2B2420]");
      expect(componentContent).toContain("rounded-full");
      expect(componentContent).toContain("min-h-[44px]");
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
