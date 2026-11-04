/**
 * Tests for lib/countries.ts — the phone split/compose/absorb helpers that
 * feed the country-code dropdown (signup, profile, Google-sign-in prompt).
 *
 * The invariant that matters: whatever the UI sends must satisfy the server's
 * rule — /^\+?[0-9]{10,15}$/ after stripping [^0-9+].
 */
import { describe, it, expect } from "vitest";
import {
  COUNTRIES,
  DEFAULT_COUNTRY,
  absorbPhoneInput,
  composePhoneNumber,
  findCountryByDial,
  searchCountries,
  splitPhoneNumber,
} from "@/lib/countries";

const SERVER_RULE = /^\+?[0-9]{10,15}$/;

describe("splitPhoneNumber", () => {
  it("splits a stored +91 number into dial and national parts", () => {
    expect(splitPhoneNumber("+919876543210")).toEqual({
      dial: "+91",
      national: "9876543210",
    });
  });

  it("splits a US number", () => {
    expect(splitPhoneNumber("+14155552671")).toEqual({
      dial: "+1",
      national: "4155552671",
    });
  });

  it("splits 3-digit dial codes before shorter ones (longest match)", () => {
    expect(splitPhoneNumber("+971501234567")).toEqual({
      dial: "+971",
      national: "501234567",
    });
  });

  it("returns default dial + empty national for empty/null input", () => {
    expect(splitPhoneNumber("")).toEqual({
      dial: `+${DEFAULT_COUNTRY.dial}`,
      national: "",
    });
    expect(splitPhoneNumber(null)).toEqual({
      dial: `+${DEFAULT_COUNTRY.dial}`,
      national: "",
    });
    expect(splitPhoneNumber(undefined).national).toBe("");
  });

  it("keeps numbers without + whole under the default dial (no guessing)", () => {
    const split = splitPhoneNumber("9876543210");
    expect(split.dial).toBe(`+${DEFAULT_COUNTRY.dial}`);
    expect(split.national).toBe("9876543210");
  });

  it("round-trips a split back through compose", () => {
    const full = "+971501234567";
    const { dial, national } = splitPhoneNumber(full);
    expect(composePhoneNumber(dial, national)).toBe(full);
  });
});

describe("composePhoneNumber", () => {
  it("strips formatting and produces a server-valid number", () => {
    const composed = composePhoneNumber("+91", "98765-43210");
    expect(composed).toBe("+919876543210");
    expect(composed.match(SERVER_RULE)).toBeTruthy();
  });

  it("never emits a double +", () => {
    expect(composePhoneNumber("+91", "+919876543210")).toBe("+91919876543210");
  });
});

describe("absorbPhoneInput", () => {
  it("keeps the current dial for ordinary national digits", () => {
    expect(absorbPhoneInput("98765 43210", "+91")).toEqual({
      dial: "+91",
      national: "9876543210",
    });
  });

  it("re-detects the country when the user pastes a full +number", () => {
    expect(absorbPhoneInput("+1 415 555 2671", "+91")).toEqual({
      dial: "+1",
      national: "4155552671",
    });
  });

  it("drops non-digit junk from the national part", () => {
    expect(absorbPhoneInput("98765abc43210", "+91").national).toBe("9876543210");
  });
});

describe("searchCountries", () => {
  it("returns everything for an empty query", () => {
    expect(searchCountries("")).toHaveLength(COUNTRIES.length);
  });

  it("matches by name", () => {
    expect(searchCountries("india")[0].code).toBe("IN");
  });

  it("matches by ISO code", () => {
    expect(searchCountries("ae").map((c) => c.code)).toContain("AE");
  });

  it("matches by dial code digits", () => {
    expect(searchCountries("971").map((c) => c.code)).toContain("AE");
  });

  it("returns nothing for nonsense", () => {
    expect(searchCountries("zzzzqqq")).toHaveLength(0);
  });
});

describe("invariants", () => {
  it("default country is India and exists in the list", () => {
    expect(DEFAULT_COUNTRY.code).toBe("IN");
    expect(COUNTRIES).toContain(DEFAULT_COUNTRY);
  });

  it("every country resolves a dial code (shared codes like +1 are ok)", () => {
    for (const c of COUNTRIES) {
      expect(findCountryByDial(c.dial)).toBeDefined();
    }
  });

  it("composing default dial + 10 digits always satisfies the server rule", () => {
    const composed = composePhoneNumber(
      `+${DEFAULT_COUNTRY.dial}`,
      "9876543210",
    );
    expect(composed.replace(/[^0-9+]/g, "").match(SERVER_RULE)).toBeTruthy();
  });
});
