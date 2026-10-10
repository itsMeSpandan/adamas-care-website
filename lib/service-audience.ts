/**
 * lib/service-audience.ts — who may book which service.
 *
 * Every service is male-only, female-only or unisex. This module is the single
 * source of that rule so the booking UI and the booking API can't disagree:
 * the UI hides services a client can't book, and the API rejects them with the
 * same predicate.
 */

import type { Gender, ServiceAudience } from "@/lib/types";

export const SERVICE_AUDIENCES: ServiceAudience[] = ["male", "female", "unisex"];

/** Human label for a service's audience. */
export const AUDIENCE_LABELS: Record<ServiceAudience, string> = {
  male: "Men only",
  female: "Women only",
  unisex: "Unisex",
};

/** Badge copy for a client with the given gender, or null for unisex. */
export function audienceLabel(audience: ServiceAudience): string {
  return AUDIENCE_LABELS[audience] ?? AUDIENCE_LABELS.unisex;
}

/** Type guard for untrusted input (API bodies, query strings). */
export function isServiceAudience(value: unknown): value is ServiceAudience {
  return typeof value === "string" && (SERVICE_AUDIENCES as string[]).includes(value);
}

/**
 * Whether a client with `clientGender` may book a service with `audience`.
 *
 * - `unisex` is open to everyone, including clients with no gender on file.
 * - `male` / `female` require a stored gender that matches. A client with no
 *   gender (or the catch-all "other") is treated as unknown and matches
 *   nothing gender-specific — unknown must never be read as male.
 */
export function canBookService(
  audience: ServiceAudience | null | undefined,
  clientGender: Gender | null | undefined
): boolean {
  // Unknown audience (older rows, unexpected data) is treated as open rather
  // than locking clients out of a service.
  if (!audience || audience === "unisex") return true;
  return clientGender === audience;
}

/** Explanation shown when a client is blocked from a service. */
export function audienceBlockedMessage(audience: ServiceAudience): string {
  return audience === "male"
    ? "This service is available to male clients only."
    : "This service is available to female clients only.";
}
