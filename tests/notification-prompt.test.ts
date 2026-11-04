/**
 * Tests for lib/notification-prompt.ts — the decision that drives the
 * start-of-visit "turn notifications on" modal.
 *
 * Product rules under test:
 *   - prompt EVERY visit until granted (dismissal is session-scoped only)
 *   - "blocked" hint instead of a prompt when permission is denied
 *   - never prompt when it would be pointless (unconfigured, unsupported,
 *     iOS-not-installed) or while a higher-priority modal owns the screen
 */
import { describe, it, expect, vi, afterEach } from "vitest";
import {
  shouldPromptForNotification,
  wasNotificationPromptDismissed,
  rememberNotificationPromptDismissed,
  type NotificationPromptState,
} from "@/lib/notification-prompt";

const base: NotificationPromptState = {
  supported: true,
  permission: "default",
  configured: true,
  isIosStandaloneRequired: false,
  dismissedThisSession: false,
  higherPriorityOpen: false,
};

describe("shouldPromptForNotification", () => {
  it("prompts with the Enable flow when permission is default", () => {
    expect(shouldPromptForNotification(base)).toBe("enable");
  });

  it("shows the unblock hint when permission is denied", () => {
    expect(shouldPromptForNotification({ ...base, permission: "denied" })).toBe(
      "blocked",
    );
  });

  it("never prompts once granted", () => {
    expect(shouldPromptForNotification({ ...base, permission: "granted" })).toBe(
      null,
    );
  });

  it("stays hidden pre-hydration (permission unknown) and when unsupported", () => {
    expect(shouldPromptForNotification({ ...base, permission: "unknown" })).toBe(null);
    expect(
      shouldPromptForNotification({ ...base, permission: "unsupported", supported: false }),
    ).toBe(null);
  });

  it("stays hidden when push is not configured server-side", () => {
    expect(shouldPromptForNotification({ ...base, configured: false })).toBe(null);
  });

  it("stays hidden on iOS Safari until the app is installed", () => {
    expect(
      shouldPromptForNotification({ ...base, isIosStandaloneRequired: true }),
    ).toBe(null);
  });

  it("stays hidden after Not now, for the rest of the session", () => {
    expect(shouldPromptForNotification({ ...base, dismissedThisSession: true })).toBe(
      null,
    );
  });

  it("yields to the higher-priority Google sign-in number prompt", () => {
    expect(shouldPromptForNotification({ ...base, higherPriorityOpen: true })).toBe(
      null,
    );
  });

  it("blocked hint survives dismissal only via session flag, not for granted", () => {
    // denied + dismissed → hidden (user saw the hint and closed it)
    expect(
      shouldPromptForNotification({
        ...base,
        permission: "denied",
        dismissedThisSession: true,
      }),
    ).toBe(null);
  });
});

describe("session dismissal storage", () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("round-trips a dismissal within the session", () => {
    const store = new Map<string, string>();
    vi.stubGlobal("window", {
      sessionStorage: {
        getItem: (k: string) => store.get(k) ?? null,
        setItem: (k: string, v: string) => void store.set(k, v),
      },
    });
    expect(wasNotificationPromptDismissed()).toBe(false);
    rememberNotificationPromptDismissed();
    expect(wasNotificationPromptDismissed()).toBe(true);
  });

  it("returns false without a window (SSR)", () => {
    vi.stubGlobal("window", undefined);
    expect(wasNotificationPromptDismissed()).toBe(false);
    expect(() => rememberNotificationPromptDismissed()).not.toThrow();
  });

  it("survives a throwing sessionStorage (private mode)", () => {
    vi.stubGlobal("window", {
      sessionStorage: {
        getItem: () => {
          throw new Error("blocked");
        },
        setItem: () => {
          throw new Error("blocked");
        },
      },
    });
    expect(wasNotificationPromptDismissed()).toBe(false);
    expect(() => rememberNotificationPromptDismissed()).not.toThrow();
  });
});
