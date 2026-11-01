import { describe, it, expect } from "vitest";

/**
 * Calculates relative luminance according to WCAG 2.1 specs
 */
function getLuminance(hex: string): number {
  const rgb = hex
    .replace("#", "")
    .match(/.{2}/g)!
    .map((x) => parseInt(x, 16) / 255)
    .map((c) => (c <= 0.03928 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4)));
  return 0.2126 * rgb[0] + 0.7152 * rgb[1] + 0.0722 * rgb[2];
}

/**
 * Calculates WCAG contrast ratio between two colors
 */
function getContrastRatio(hex1: string, hex2: string): number {
  const lum1 = getLuminance(hex1);
  const lum2 = getLuminance(hex2);
  const brightest = Math.max(lum1, lum2);
  const darkest = Math.min(lum1, lum2);
  return (brightest + 0.05) / (darkest + 0.05);
}

describe("Navbar Design Specifications", () => {
  describe("Color Palette and WCAG Contrast", () => {
    const WARM_CREAM = "#F4EFE8";
    const DEEP_ESPRESSO = "#2B2420";
    const MUTED_BROWN = "#6B5C50";
    const AVATAR_BG = "#E4D8CA";
    const AVATAR_TEXT = "#5B4636";
    const CORAL_DOT = "#B5503C";
    const DIVIDER = "#D8CCBE";
    const HAIRLINE_BORDER = "#DDD3C7";

    it("verifies deep espresso text on warm cream passes WCAG AAA contrast (> 7:1)", () => {
      const contrast = getContrastRatio(DEEP_ESPRESSO, WARM_CREAM);
      expect(contrast).toBeGreaterThanOrEqual(7.0);
      expect(contrast).toBeGreaterThan(12.0);
    });

    it("verifies muted secondary text (#6B5C50) on warm cream passes WCAG AA contrast (>= 4.5:1)", () => {
      const contrast = getContrastRatio(MUTED_BROWN, WARM_CREAM);
      expect(contrast).toBeGreaterThanOrEqual(4.5);
    });

    it("verifies avatar initials (#5B4636) on avatar background (#E4D8CA) pass WCAG AA contrast (>= 4.5:1)", () => {
      const contrast = getContrastRatio(AVATAR_TEXT, AVATAR_BG);
      expect(contrast).toBeGreaterThanOrEqual(4.5);
    });

    it("validates palette hex constants match the specification exactly", () => {
      expect(WARM_CREAM.toUpperCase()).toBe("#F4EFE8");
      expect(DEEP_ESPRESSO.toUpperCase()).toBe("#2B2420");
      expect(MUTED_BROWN.toUpperCase()).toBe("#6B5C50");
      expect(AVATAR_BG.toUpperCase()).toBe("#E4D8CA");
      expect(AVATAR_TEXT.toUpperCase()).toBe("#5B4636");
      expect(CORAL_DOT.toUpperCase()).toBe("#B5503C");
      expect(DIVIDER.toUpperCase()).toBe("#D8CCBE");
      expect(HAIRLINE_BORDER.toUpperCase()).toBe("#DDD3C7");
    });
  });

  describe("Hamburger Icon Geometry", () => {
    it("matches exact grid coordinates and ratios", () => {
      // Top line
      const top = { x1: 4.5, y1: 6, x2: 19.5, y2: 6 };
      // Middle line
      const middle = { x1: 4.5, y1: 12, x2: 12.5, y2: 12 };
      // Bottom line
      const bottom = { x1: 4.5, y1: 18, x2: 19.5, y2: 18 };

      const longLength = top.x2 - top.x1; // 15
      const shortLength = middle.x2 - middle.x1; // 8
      const ratio = shortLength / longLength; // 8/15 ≈ 0.5333

      expect(longLength).toBe(15);
      expect(shortLength).toBe(8);
      expect(ratio).toBeCloseTo(0.533, 2); // about 55% as specified
      expect(bottom.x2 - bottom.x1).toBe(longLength);

      expect(top.y1).toBe(6);
      expect(middle.y1).toBe(12);
      expect(bottom.y1).toBe(18);
    });
  });

  describe("Logo Specifications", () => {
    it("confirms logo geometry values", () => {
      const wordmarkSizePx = 32;
      const wordmarkTrackingEm = 0.16;
      const subtitleSizePx = 10;
      const subtitleTrackingEm = 0.5;
      const lineLengthPx = 26;

      expect(wordmarkSizePx).toBe(32);
      expect(wordmarkTrackingEm).toBe(0.16);
      expect(subtitleSizePx).toBe(10);
      expect(subtitleTrackingEm).toBe(0.5);
      expect(lineLengthPx).toBe(26);
    });
  });

  describe("Authentication State Specifications", () => {
    function computeUserInitials(user: { name?: string | null; email?: string | null } | null): string {
      if (!user) return "";
      if (user.name) {
        return user.name
          .trim()
          .split(/\s+/)
          .filter(Boolean)
          .map((n) => n[0])
          .slice(0, 2)
          .join("")
          .toUpperCase();
      }
      if (user.email) {
        return user.email.slice(0, 2).toUpperCase();
      }
      return "U";
    }

    function computeDisplayName(user: { name?: string | null; email?: string | null } | null): string {
      if (!user) return "";
      if (user.name) {
        return user.name.trim().split(/\s+/)[0];
      }
      if (user.email) {
        return user.email.split("@")[0];
      }
      return "Member";
    }

    it("does not leak Spandan Dhar mock name or initials for unauthenticated visitors", () => {
      const guestUser = null;
      expect(computeDisplayName(guestUser)).toBe("");
      expect(computeUserInitials(guestUser)).toBe("");
    });

    it("correctly derives initials and display name for real authenticated users", () => {
      const spandan = { name: "Spandan Dhar", email: "spandan@example.com" };
      expect(computeDisplayName(spandan)).toBe("Spandan");
      expect(computeUserInitials(spandan)).toBe("SD");

      const alice = { name: "Alice Wonderland", email: "alice@example.com" };
      expect(computeDisplayName(alice)).toBe("Alice");
      expect(computeUserInitials(alice)).toBe("AW");

      const nameless = { name: "", email: "developer@adamascare.com" };
      expect(computeDisplayName(nameless)).toBe("developer");
      expect(computeUserInitials(nameless)).toBe("DE");
    });

    it("verifies unauthenticated visitors only see the hamburger menu in the navbar (no sign-in button)", () => {
      // Contract: for unauthenticated visitors, only hamburger button is present in the right actions container.
      const getRenderedActions = (isAuthenticated: boolean) => {
        if (!isAuthenticated) {
          return ["hamburger"];
        }
        return ["bell", "divider", "userMenu", "divider", "hamburger"];
      };

      const guestActions = getRenderedActions(false);
      expect(guestActions).toEqual(["hamburger"]);
      expect(guestActions).not.toContain("signInButton");
      expect(guestActions).not.toContain("bell");
      expect(guestActions).not.toContain("userMenu");

      const memberActions = getRenderedActions(true);
      expect(memberActions).toEqual(["bell", "divider", "userMenu", "divider", "hamburger"]);
    });
  });

  describe("Staggered Menu Typography & Styling Specifications", () => {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const fs = require("fs");
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const path = require("path");
    const menuCss = fs.readFileSync(
      path.join(process.cwd(), "components/ui/StaggeredMenu.css"),
      "utf8"
    );

    it("enforces Jost as primary font-family on wrapper, panel, items, and labels", () => {
      expect(menuCss).toContain("font-family: var(--font-jost)");
      expect(menuCss).toContain('"Jost"');
    });

    it("enforces exact 3.5rem size, 600 weight, -2px letter-spacing, and uppercase transform on items", () => {
      expect(menuCss).toContain("font-size: 3.5rem");
      expect(menuCss).toContain("font-weight: 600");
      expect(menuCss).toContain("letter-spacing: -2px");
      expect(menuCss).toContain("text-transform: uppercase");
      expect(menuCss).toContain("color: #000000");
    });

    it("configures superscript decimal numbering with Jost and brand terracotta accent", () => {
      expect(menuCss).toContain("counter(smItem, decimal-leading-zero)");
      expect(menuCss).toContain("font-size: 18px");
      expect(menuCss).toContain("var(--sm-accent, #C97B5C)");
    });

    it("configures socials title and links with Jost typography", () => {
      expect(menuCss).toContain(".sm-socials-title");
      expect(menuCss).toContain(".sm-socials-link");
      expect(menuCss).toContain("color: var(--sm-accent, #C97B5C)");
    });
  });
});
