/**
 * Tests for lib/gender-prompt.ts — the decision that drives the
 * start-of-visit gender profile gate.
 *
 * Product rules under test:
 *   - prompt EVERY visit until a gender is stored (dismissal is session-only)
 *   - never prompt once a gender exists
 *   - yield to the post-Google-sign-in number prompt
 */
import { describe, it, expect, vi, afterEach } from "vitest";
import {
  shouldPromptForGender,
  wasGenderPromptDismissed,
  rememberGenderPromptDismissed,
  clearGenderPromptDismissed,
  type GenderPromptState,
} from "@/lib/gender-prompt";

const base: GenderPromptState = {
  hasGender: false,
  dismissedThisSession: false,
  higherPriorityOpen: false,
};

describe("shouldPromptForGender", () => {
  it("prompts when the account has no gender", () => {
    expect(shouldPromptForGender(base)).toBe(true);
  });

  it("never prompts once a gender is stored", () => {
    expect(shouldPromptForGender({ ...base, hasGender: true })).toBe(false);
  });

  it("stays hidden after Not now, for the rest of the session", () => {
    expect(shouldPromptForGender({ ...base, dismissedThisSession: true })).toBe(false);
  });

  it("yields to the higher-priority Google sign-in number prompt", () => {
    expect(shouldPromptForGender({ ...base, higherPriorityOpen: true })).toBe(false);
  });

  it("a stored gender wins over every other signal (stays hidden)", () => {
    expect(
      shouldPromptForGender({
        hasGender: true,
        dismissedThisSession: false,
        higherPriorityOpen: false,
      }),
    ).toBe(false);
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
        removeItem: (k: string) => void store.delete(k),
      },
    });
    expect(wasGenderPromptDismissed()).toBe(false);
    rememberGenderPromptDismissed();
    expect(wasGenderPromptDismissed()).toBe(true);
    clearGenderPromptDismissed();
    expect(wasGenderPromptDismissed()).toBe(false);
  });

  it("returns false without a window (SSR)", () => {
    vi.stubGlobal("window", undefined);
    expect(wasGenderPromptDismissed()).toBe(false);
    expect(() => rememberGenderPromptDismissed()).not.toThrow();
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
        removeItem: () => {
          throw new Error("blocked");
        },
      },
    });
    expect(wasGenderPromptDismissed()).toBe(false);
    expect(() => rememberGenderPromptDismissed()).not.toThrow();
    expect(() => clearGenderPromptDismissed()).not.toThrow();
  });
});
