import { describe, it, expect } from "vitest";
import fs from "fs";
import path from "path";

describe("Adamas Care - Responsive Auth Experience Specifications", () => {
  const cssPath = path.resolve(process.cwd(), "app/globals.css");
  const authCssPath = path.resolve(process.cwd(), "components/auth/AuthExperience.css");
  const authComponentPath = path.resolve(process.cwd(), "components/auth/AuthExperience.tsx");

  const globalsCss = fs.readFileSync(cssPath, "utf8");
  const authCss = fs.readFileSync(authCssPath, "utf8");
  const authTsx = fs.readFileSync(authComponentPath, "utf8");

  describe("1. Brand Tokens & CSS Variables", () => {
    it("defines all required brand color variables in app/globals.css", () => {
      expect(globalsCss).toContain("--auth-page-cream: #F4EFE8;");
      expect(globalsCss).toContain("--auth-card: #FBF8F4;");
      expect(globalsCss).toContain("--auth-input-fill: #F1EADF;");
      expect(globalsCss).toContain("--auth-border: #DDD3C7;");
      expect(globalsCss).toContain("--auth-border-subtle: #E6DDD2;");
      expect(globalsCss).toContain("--auth-espresso: #2B2420;");
      expect(globalsCss).toContain("--auth-muted: #6B5C50;");
      expect(globalsCss).toContain("--auth-accent-coral: #A8483A;");
      expect(globalsCss).toContain("--auth-dark-panel: #2A211C;");
      expect(globalsCss).toContain("--auth-panel-text: #F4EFE8;");
      expect(globalsCss).toContain("--auth-panel-muted: #DCCFC1;");
    });

    it("defines typography font variables with fallback stacks", () => {
      expect(globalsCss).toContain("--auth-font-title: var(--font-cormorant), Georgia, serif;");
      expect(globalsCss).toContain("--auth-font-body: var(--font-inter), system-ui, -apple-system, sans-serif;");
    });

    it("defines clamp type scale and radii variables", () => {
      expect(globalsCss).toContain("--auth-radius-input: 12px;");
      expect(globalsCss).toContain("--auth-radius-card: 28px;");
      expect(globalsCss).toContain("--auth-radius-card-mobile: 20px;");
      expect(globalsCss).toContain("--auth-radius-panel: 18px;");
      expect(globalsCss).toContain("clamp(1.75rem, 1.2rem + 2vw, 2.9rem)");
    });
  });

  describe("2. Layout System & Responsive Breakpoints", () => {
    it("uses 100dvh min-height to avoid mobile browser toolbar clipping", () => {
      expect(authTsx).toContain("min-h-[100dvh]");
    });

    it("respects safe areas using env(safe-area-inset-*)", () => {
      expect(authTsx).toContain("safe-area-inset-top");
      expect(authTsx).toContain("safe-area-inset-bottom");
      expect(authTsx).toContain("safe-area-inset-left");
      expect(authTsx).toContain("safe-area-inset-right");
    });

    it("uses fluid scaling occupying full screen length and width", () => {
      expect(authCss).toContain("width: 100%;");
      expect(authCss).toContain("min-height: 100dvh;");
    });

    it("implements desktop/tablet horizontal sliding panel with spring physics morph transition", () => {
      expect(authTsx).toContain("auth-sliding-panel");
      expect(authTsx).toContain("stiffness: 220");
      expect(authTsx).toContain("damping: 26");
    });

    it("respects prefers-reduced-motion for sliding and cross-fade animations", () => {
      expect(authCss).toContain("@media (prefers-reduced-motion: reduce)");
      expect(authCss).toContain("transition: none !important;");
    });

    it("handles <= 360px small phones by stacking social buttons and shrinking gender icons to 22px", () => {
      expect(authCss).toContain("@media (max-width: 360px)");
      expect(authCss).toContain("grid-template-columns: 1fr !important;");
      expect(authCss).toContain("width: 22px !important;");
      expect(authCss).toContain("height: 22px !important;");
    });

    it("handles landscape phones (max-height: 500px) by hiding circles and allowing natural scrolling", () => {
      expect(authCss).toContain("@media (max-height: 500px)");
      expect(authCss).toContain(".auth-sliding-panel");
      expect(authCss).toContain(".auth-decorative-circle");
    });
  });

  describe("3. Form Specifications & Semantic Content", () => {
    it("includes Google and Microsoft social buttons only", () => {
      expect(authTsx).toContain("Google");
      expect(authTsx).toContain("Microsoft");
      // Check that no other third-party providers like Facebook or Apple are added
      expect(authTsx).not.toContain("Continue with Apple");
      expect(authTsx).not.toContain("Continue with Facebook");
    });

    it("renders gender selector as three equal cards (Female / Male / Other) in a radio group", () => {
      expect(authTsx).toContain('role="radiogroup"');
      expect(authTsx).toContain('aria-label="Gender"');
      expect(authTsx).toContain('value="female"');
      expect(authTsx).toContain('value="male"');
      expect(authTsx).toContain('value="other"');
      expect(authTsx).toContain("FemaleSymbol");
      expect(authTsx).toContain("MaleSymbol");
      expect(authTsx).toContain("OtherSymbol");
    });

    it("configures phone input with fixed ~96px country-code button and flex:1 number input", () => {
      expect(authTsx).toContain('w-[96px] shrink-0');
      expect(authTsx).toContain('flex-1 min-w-0');
      expect(authTsx).toContain("Optional — used for booking updates");
    });

    it("includes password show/hide eye toggle button with accessible aria-label", () => {
      expect(authTsx).toContain('aria-label={showPassword ? "Hide password" : "Show password"}');
      expect(authTsx).toContain("EyeOffIcon");
      expect(authTsx).toContain("EyeIcon");
    });

    it("enforces autocomplete, inputmode, and enterkeyhint standards", () => {
      expect(authTsx).toContain('autoComplete="name"');
      expect(authTsx).toContain('autoComplete="email"');
      expect(authTsx).toContain('autoComplete="tel"');
      expect(authTsx).toContain('autoComplete="current-password"');
      expect(authTsx).toContain('autoComplete="new-password"');
      expect(authTsx).toContain('enterKeyHint="next"');
      expect(authTsx).toContain('enterKeyHint="done"');
      expect(authTsx).toContain('inputMode="tel"');
    });

    it("shows icon plus text in #A8483A for field validation errors (not color alone)", () => {
      expect(authTsx).toContain("<WarningIcon />");
      expect(authTsx).toContain("text-[#A8483A]");
      expect(authTsx).toContain('role="alert"');
      expect(authTsx).toContain('aria-live="polite"');
    });
  });

  describe("4. Mobile Segmented Tab Control (< 768px)", () => {
    it("uses semantic ARIA tabs pattern for mobile navigation with morphing active indicator", () => {
      expect(authTsx).toContain('role="tablist"');
      expect(authTsx).toContain('role="tab"');
      expect(authTsx).toContain('role="tabpanel"');
      expect(authTsx).toContain("aria-selected=");
      expect(authTsx).toContain("aria-controls=");
      expect(authTsx).toContain('layoutId="auth-tab-pill"');
    });
  });

  describe("5. Dark Overlay Panel Content", () => {
    it("features the exact Adamas Care wordmark and messages", () => {
      expect(authTsx).toContain("New here?");
      expect(authTsx).toContain("Create an account to get started with Adamas Care.");
      expect(authTsx).toContain("Welcome back");
      expect(authTsx).toContain("Already have an account? Sign in to pick up where you left off.");
      expect(authTsx).toContain("SIGN UP");
      expect(authTsx).toContain("SIGN IN");
      expect(authTsx).toContain("border border-[#F4EFE8]");
    });
  });
});
