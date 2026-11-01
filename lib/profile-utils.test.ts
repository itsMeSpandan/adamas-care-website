import { describe, it, expect } from "vitest";
import {
  formatMemberSince,
  formatLoyaltyPoints,
  getRoleBadge,
  shouldShowPoints,
  normalizeSection,
  parseSectionFromUrl,
  computePushToggleView,
} from "./profile-utils";

describe("formatMemberSince", () => {
  it("formats ISO timestamps into 'Member since <Month YYYY>' in UTC", () => {
    expect(formatMemberSince("2026-10-15T10:30:00.000Z")).toBe("Member since October 2026");
    expect(formatMemberSince("2024-01-01T00:00:00.000Z")).toBe("Member since January 2024");
    expect(formatMemberSince("2025-12-31T23:59:59.000Z")).toBe("Member since December 2025");
  });

  it("handles standard YYYY-MM-DD date strings", () => {
    const result = formatMemberSince("2026-05-15");
    expect(result).toBe("Member since May 2026");
  });

  it("returns null for invalid or missing dates, never 'undefined' or 'NaN'", () => {
    expect(formatMemberSince(undefined)).toBeNull();
    expect(formatMemberSince(null)).toBeNull();
    expect(formatMemberSince("")).toBeNull();
    expect(formatMemberSince("   ")).toBeNull();
    expect(formatMemberSince("invalid-date-string")).toBeNull();
    expect(formatMemberSince("undefined")).toBeNull();
  });
});

describe("formatLoyaltyPoints", () => {
  it("formats positive numbers with thousands separators", () => {
    expect(formatLoyaltyPoints(0)).toBe("0");
    expect(formatLoyaltyPoints(50)).toBe("50");
    expect(formatLoyaltyPoints(250)).toBe("250");
    expect(formatLoyaltyPoints(1000)).toBe("1,000");
    expect(formatLoyaltyPoints(12500)).toBe("12,500");
    expect(formatLoyaltyPoints(1000000)).toBe("1,000,000");
  });

  it("falls back to '0' on null, undefined, NaN, or negative points", () => {
    expect(formatLoyaltyPoints(null)).toBe("0");
    expect(formatLoyaltyPoints(undefined)).toBe("0");
    expect(formatLoyaltyPoints(NaN)).toBe("0");
    expect(formatLoyaltyPoints(-10)).toBe("0");
    expect(formatLoyaltyPoints(-9999)).toBe("0");
  });

  it("floors decimal points safely", () => {
    expect(formatLoyaltyPoints(99.9)).toBe("99");
    expect(formatLoyaltyPoints(0.5)).toBe("0");
  });
});

describe("getRoleBadge", () => {
  it("returns 'MEMBER' for regular user roles", () => {
    expect(getRoleBadge("user")).toBe("MEMBER");
    expect(getRoleBadge("guest")).toBe("MEMBER");
    expect(getRoleBadge(undefined)).toBe("MEMBER");
    expect(getRoleBadge(null)).toBe("MEMBER");
    expect(getRoleBadge("")).toBe("MEMBER");
  });

  it("returns 'ADMIN' for admin role", () => {
    expect(getRoleBadge("admin")).toBe("ADMIN");
    expect(getRoleBadge("ADMIN")).toBe("ADMIN");
    expect(getRoleBadge(" Admin ")).toBe("ADMIN");
  });

  it("returns 'SPECIALIST' for employee role", () => {
    expect(getRoleBadge("employee")).toBe("SPECIALIST");
    expect(getRoleBadge("EMPLOYEE")).toBe("SPECIALIST");
    expect(getRoleBadge(" Employee ")).toBe("SPECIALIST");
  });
});

describe("shouldShowPoints", () => {
  it("always shows points for customer accounts, even with 0 points", () => {
    expect(shouldShowPoints("user", 0)).toBe(true);
    expect(shouldShowPoints("user", 150)).toBe(true);
    expect(shouldShowPoints("user", null)).toBe(true);
    expect(shouldShowPoints(undefined, 0)).toBe(true);
  });

  it("hides points for admin accounts when they have none (0 or null)", () => {
    expect(shouldShowPoints("admin", 0)).toBe(false);
    expect(shouldShowPoints("admin", null)).toBe(false);
    expect(shouldShowPoints("admin", undefined)).toBe(false);
    expect(shouldShowPoints("admin", 250)).toBe(true);
  });

  it("hides points for employee accounts when they have none (0 or null)", () => {
    expect(shouldShowPoints("employee", 0)).toBe(false);
    expect(shouldShowPoints("employee", null)).toBe(false);
    expect(shouldShowPoints("employee", 100)).toBe(true);
  });
});

describe("Section Routing & Deep Links", () => {
  it("recognizes all valid sections via normalizeSection", () => {
    expect(normalizeSection("profile")).toBe("profile");
    expect(normalizeSection("security")).toBe("security");
    expect(normalizeSection("bookings")).toBe("bookings");
    expect(normalizeSection("waitlist")).toBe("waitlist");
  });

  it("handles case-insensitivity and whitespace in normalizeSection", () => {
    expect(normalizeSection(" Bookings ")).toBe("bookings");
    expect(normalizeSection("PROFILE")).toBe("profile");
    expect(normalizeSection("Security")).toBe("security");
  });

  it("returns null for unrecognized or missing query params", () => {
    expect(normalizeSection("")).toBeNull();
    expect(normalizeSection(null)).toBeNull();
    expect(normalizeSection(undefined)).toBeNull();
    expect(normalizeSection("unknown")).toBeNull();
    expect(normalizeSection("settings")).toBeNull();
  });

  it("parses modern ?section= deep links", () => {
    expect(parseSectionFromUrl("?section=profile")).toBe("profile");
    expect(parseSectionFromUrl("?section=security")).toBe("security");
    expect(parseSectionFromUrl("?section=bookings")).toBe("bookings");
    expect(parseSectionFromUrl("?section=waitlist")).toBe("waitlist");
  });

  it("preserves legacy ?tab= deep links for notifications, emails, and bookmarks", () => {
    expect(parseSectionFromUrl("?tab=bookings")).toBe("bookings");
    expect(parseSectionFromUrl("?tab=waitlist")).toBe("waitlist");
    expect(parseSectionFromUrl("?tab=profile")).toBe("profile");
    expect(parseSectionFromUrl("?tab=security")).toBe("security");
  });

  it("gives precedence to ?section= if both ?section= and ?tab= are provided", () => {
    expect(parseSectionFromUrl("?section=waitlist&tab=bookings")).toBe("waitlist");
  });

  it("returns null when neither section nor valid tab is provided", () => {
    expect(parseSectionFromUrl("")).toBeNull();
    expect(parseSectionFromUrl("?other=val")).toBeNull();
    expect(parseSectionFromUrl("?tab=nonexistent")).toBeNull();
  });
});

describe("Push Notification Toggle States", () => {
  it("computes active ON state when permission is granted and device registered", () => {
    const view = computePushToggleView({
      permission: "granted",
      registered: true,
      busy: false,
      configured: true,
      isIosStandaloneRequired: false,
    });
    expect(view.isOn).toBe(true);
    expect(view.isDisabled).toBe(false);
    expect(view.ariaLabel).toBe("Turn off push notifications");
    expect(view.helperType).toBe("success");
    expect(view.helperText).toContain("This device is registered");
  });

  it("computes OFF state when permission is default", () => {
    const view = computePushToggleView({
      permission: "default",
      registered: false,
      busy: false,
      configured: true,
      isIosStandaloneRequired: false,
    });
    expect(view.isOn).toBe(false);
    expect(view.isDisabled).toBe(false);
    expect(view.ariaLabel).toBe("Turn on push notifications");
    expect(view.helperText).toBeNull();
  });

  it("disables switch when action is busy in-flight", () => {
    const view = computePushToggleView({
      permission: "granted",
      registered: true,
      busy: true,
      configured: true,
      isIosStandaloneRequired: false,
    });
    expect(view.isOn).toBe(true);
    expect(view.isDisabled).toBe(true);
  });

  it("surfaces error state when notifications are blocked by the browser", () => {
    const view = computePushToggleView({
      permission: "denied",
      registered: false,
      busy: false,
      configured: true,
      isIosStandaloneRequired: false,
    });
    expect(view.isOn).toBe(false);
    expect(view.helperType).toBe("error");
    expect(view.helperText).toContain("Blocked in browser");
  });

  it("surfaces informational prompt when iOS requires Home Screen install", () => {
    const view = computePushToggleView({
      permission: "default",
      registered: false,
      busy: false,
      configured: true,
      isIosStandaloneRequired: true,
    });
    expect(view.isOn).toBe(false);
    expect(view.helperType).toBe("info");
    expect(view.helperText).toContain("Home Screen");
  });

  it("surfaces server or token registration error", () => {
    const view = computePushToggleView({
      permission: "granted",
      registered: false,
      busy: false,
      configured: true,
      isIosStandaloneRequired: false,
      error: "Could not register this device. Please try again.",
    });
    expect(view.isOn).toBe(false);
    expect(view.helperType).toBe("error");
    expect(view.helperText).toBe("Could not register this device. Please try again.");
  });

  it("handles unsupported browser environment safely", () => {
    const view = computePushToggleView({
      permission: "unsupported",
      registered: false,
      busy: false,
      configured: false,
      isIosStandaloneRequired: false,
    });
    expect(view.isOn).toBe(false);
    expect(view.isDisabled).toBe(true);
    expect(view.helperType).toBe("info");
    expect(view.helperText).toContain("Not supported");
  });
});
