/**
 * tests/whatsapp-prompt.test.ts — guards for the post-Google-sign-in
 * contact-number prompt.
 *
 * The product rule under test: prompt Google sign-in users for their number,
 * but NEVER prompt an account that already stores one. That guard is the
 * reason the feature can't annoy existing users, so it gets explicit coverage.
 */
import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import {
  shouldPromptForWhatsApp,
  validateWhatsAppNumber,
  wasWhatsAppPromptDismissed,
  rememberWhatsAppPromptDismissed,
  clearWhatsAppPromptDismissed,
} from "@/lib/whatsapp-prompt";

describe("shouldPromptForWhatsApp", () => {
  it("prompts when the account has no number at all", () => {
    expect(shouldPromptForWhatsApp({ whatsappNumber: null }, false)).toBe(true);
    expect(shouldPromptForWhatsApp({}, false)).toBe(true);
  });

  it("prompts when the number is empty or whitespace only", () => {
    expect(shouldPromptForWhatsApp({ whatsappNumber: "" }, false)).toBe(true);
    expect(shouldPromptForWhatsApp({ whatsappNumber: "   " }, false)).toBe(true);
  });

  it("NEVER prompts when the account already has a number and a gender", () => {
    expect(
      shouldPromptForWhatsApp({ whatsappNumber: "9876543210", gender: "female" }, false)
    ).toBe(false);
    expect(
      shouldPromptForWhatsApp({ whatsappNumber: "+919876543210", gender: "male" }, false)
    ).toBe(false);
    expect(
      shouldPromptForWhatsApp({ whatsappNumber: " 98765 43210 ", gender: "other" }, false)
    ).toBe(false);
  });

  it("prompts when only the gender is missing (the modal collects both)", () => {
    // The post-Google-sign-in modal asks for the number AND the gender, so a
    // stored number alone is not enough to suppress it. Storing a real gender
    // is what closes it, once and for good.
    expect(shouldPromptForWhatsApp({ whatsappNumber: "9876543210" }, false)).toBe(true);
    expect(
      shouldPromptForWhatsApp({ whatsappNumber: "9876543210", gender: "" }, false)
    ).toBe(true);
  });

  it("never prompts once dismissed on this device", () => {
    expect(shouldPromptForWhatsApp({ whatsappNumber: null }, true)).toBe(false);
    expect(shouldPromptForWhatsApp({ whatsappNumber: "" }, true)).toBe(false);
  });

  it("never prompts when there is no signed-in user", () => {
    expect(shouldPromptForWhatsApp(null, false)).toBe(false);
    expect(shouldPromptForWhatsApp(undefined, false)).toBe(false);
  });
});

describe("validateWhatsAppNumber", () => {
  it("rejects empty input", () => {
    expect(validateWhatsAppNumber("")).toBeTruthy();
    expect(validateWhatsAppNumber("   ")).toBeTruthy();
  });

  it("accepts a plain 10-digit Indian mobile number", () => {
    expect(validateWhatsAppNumber("9876543210")).toBeNull();
  });

  it("accepts an E.164 number with a plus prefix", () => {
    expect(validateWhatsAppNumber("+919876543210")).toBeNull();
  });

  it("tolerates formatting characters the user pastes in", () => {
    expect(validateWhatsAppNumber("+91 98765-43210")).toBeNull();
    expect(validateWhatsAppNumber("(987) 654-3210")).toBeNull();
  });

  it("rejects too-short and too-long numbers", () => {
    expect(validateWhatsAppNumber("12345")).toBeTruthy();
    expect(validateWhatsAppNumber("1234567890123456")).toBeTruthy();
  });

  it("matches the server rule in app/api/auth/profile/route.ts", () => {
    // Same cleaning + regex the API applies; if these ever diverge the UI
    // would accept a number the server then rejects with 400.
    const serverAccepts = (raw: string) => {
      const clean = raw.replace(/[^0-9+]/g, "");
      return /^\+?[0-9]{10,15}$/.test(clean);
    };
    const samples = [
      "9876543210",
      "+919876543210",
      "+91 98765 43210",
      "(987) 654-3210",
      "12345",
      "1234567890123456",
      "abc",
      "",
    ];
    for (const sample of samples) {
      const uiOk = validateWhatsAppNumber(sample) === null;
      const serverOk = serverAccepts(sample);
      // "abc" cleans to "" — server regex fails, UI must fail too.
      expect(uiOk, `mismatch for "${sample}"`).toBe(serverOk);
    }
  });
});

describe("dismissal persistence", () => {
  beforeEach(() => {
    // jsdom-free vitest: give the module a minimal localStorage.
    const store = new Map<string, string>();
    vi.stubGlobal("window", {
      localStorage: {
        getItem: (k: string) => (store.has(k) ? store.get(k)! : null),
        setItem: (k: string, v: string) => void store.set(k, v),
        removeItem: (k: string) => void store.delete(k),
      },
    });
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("is not dismissed by default", () => {
    expect(wasWhatsAppPromptDismissed("user-1")).toBe(false);
  });

  it("remembers a dismissal per user", () => {
    rememberWhatsAppPromptDismissed("user-1");
    expect(wasWhatsAppPromptDismissed("user-1")).toBe(true);
    // Scoped to that user only.
    expect(wasWhatsAppPromptDismissed("user-2")).toBe(false);
  });

  it("clears a dismissal", () => {
    rememberWhatsAppPromptDismissed("user-1");
    clearWhatsAppPromptDismissed("user-1");
    expect(wasWhatsAppPromptDismissed("user-1")).toBe(false);
  });

  it("returns false when storage is unavailable (SSR / private mode)", () => {
    vi.stubGlobal("window", undefined);
    // No window → treated as "not dismissed", never a throw.
    expect(wasWhatsAppPromptDismissed("user-1")).toBe(false);
    expect(() => rememberWhatsAppPromptDismissed("user-1")).not.toThrow();
    expect(() => clearWhatsAppPromptDismissed("user-1")).not.toThrow();
  });

  it("survives a throwing localStorage (quota / disabled cookies)", () => {
    vi.stubGlobal("window", {
      localStorage: {
        getItem: () => {
          throw new Error("SecurityError");
        },
        setItem: () => {
          throw new Error("QuotaExceededError");
        },
        removeItem: () => {
          throw new Error("SecurityError");
        },
      },
    });
    expect(wasWhatsAppPromptDismissed("user-1")).toBe(false);
    expect(() => rememberWhatsAppPromptDismissed("user-1")).not.toThrow();
    expect(() => clearWhatsAppPromptDismissed("user-1")).not.toThrow();
  });
});
