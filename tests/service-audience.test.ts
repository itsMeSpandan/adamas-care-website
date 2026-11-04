/**
 * tests/service-audience.test.ts — the male / female / unisex service rule.
 *
 * Every service is offered to men only, women only, or everyone. The booking
 * UI hides what a client can't book and the booking + waitlist APIs reject it,
 * both through `canBookService`, so the edge cases that matter are:
 *   - unisex is open to clients with no gender on file
 *   - a client whose gender is unknown ("other" / null) matches nothing
 *     gender-specific — unknown must never be read as male
 *   - an unknown/legacy audience value stays bookable rather than locking a
 *     service out for everyone
 */
import { describe, it, expect } from "vitest";
import {
  AUDIENCE_LABELS,
  SERVICE_AUDIENCES,
  audienceBlockedMessage,
  audienceLabel,
  canBookService,
  isServiceAudience,
} from "@/lib/service-audience";
import type { ServiceAudience } from "@/lib/types";

describe("canBookService", () => {
  it("lets everyone book unisex services, including clients with no gender", () => {
    expect(canBookService("unisex", "male")).toBe(true);
    expect(canBookService("unisex", "female")).toBe(true);
    expect(canBookService("unisex", "other")).toBe(true);
    expect(canBookService("unisex", null)).toBe(true);
    expect(canBookService("unisex", undefined)).toBe(true);
  });

  it("requires a matching gender for gender-specific services", () => {
    expect(canBookService("female", "female")).toBe(true);
    expect(canBookService("male", "male")).toBe(true);

    expect(canBookService("female", "male")).toBe(false);
    expect(canBookService("male", "female")).toBe(false);
  });

  it("treats unknown / other gender as matching nothing gender-specific", () => {
    expect(canBookService("female", "other")).toBe(false);
    expect(canBookService("male", "other")).toBe(false);
    expect(canBookService("female", null)).toBe(false);
    expect(canBookService("male", undefined)).toBe(false);
  });

  it("keeps legacy or missing audience values bookable", () => {
    expect(canBookService(null, "male")).toBe(true);
    expect(canBookService(undefined, null)).toBe(true);
  });

  it("only offers gender-specific services to the matching gender", () => {
    const services = [
      { id: "a", audience: "male" as ServiceAudience },
      { id: "b", audience: "female" as ServiceAudience },
      { id: "c", audience: "unisex" as ServiceAudience },
    ];
    const bookable = (gender: Parameters<typeof canBookService>[1]) =>
      services.filter((s) => canBookService(s.audience, gender)).map((s) => s.id);

    expect(bookable("male")).toEqual(["a", "c"]);
    expect(bookable("female")).toEqual(["b", "c"]);
    expect(bookable("other")).toEqual(["c"]);
    expect(bookable(null)).toEqual(["c"]);
  });
});

describe("service audience helpers", () => {
  it("recognises every audience and rejects everything else", () => {
    expect(SERVICE_AUDIENCES).toEqual(["male", "female", "unisex"]);
    for (const a of SERVICE_AUDIENCES) expect(isServiceAudience(a)).toBe(true);

    for (const bad of ["Men", "MALE", "", "both", null, undefined, 3, {}, []]) {
      expect(isServiceAudience(bad)).toBe(false);
    }
  });

  it("labels every audience", () => {
    expect(audienceLabel("male")).toBe("Men only");
    expect(audienceLabel("female")).toBe("Women only");
    expect(audienceLabel("unisex")).toBe("Unisex");
    // Falls back rather than rendering "undefined" for unexpected data.
    expect(audienceLabel("legacy" as ServiceAudience)).toBe("Unisex");
  });

  it("explains a blocked booking in the client's terms", () => {
    expect(audienceBlockedMessage("male")).toMatch(/male clients only/i);
    expect(audienceBlockedMessage("female")).toMatch(/female clients only/i);
    expect(Object.keys(AUDIENCE_LABELS)).toHaveLength(SERVICE_AUDIENCES.length);
  });
});
