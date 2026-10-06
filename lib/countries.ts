/**
 * lib/countries.ts — country data + phone-number helpers for the
 * country-code dropdown used wherever a phone/WhatsApp number is entered.
 *
 * Storage format stays unchanged: the server validates
 * `/^\+?[0-9]{10,15}$/` after stripping `[^0-9+]`, so everything here
 * composes to `+<dial><national digits>` (E.164-ish) before it is sent.
 *
 * Flags render from flagcdn.com (emoji flags don't render as flags in
 * Chrome on Windows) — flagcdn.com is allow-listed in middleware.ts CSP.
 */

export interface CountryOption {
  /** ISO 3166-1 alpha-2, uppercase (matches flagcdn path, lowercased there). */
  code: string;
  /** International dial code WITHOUT the "+". */
  dial: string;
  name: string;
}

/** Curated list — alphabetical by ISO code. Covers the salon's likely clientele. */
export const COUNTRIES: CountryOption[] = [
  { code: "AE", dial: "971", name: "United Arab Emirates" },
  { code: "AR", dial: "54", name: "Argentina" },
  { code: "AU", dial: "61", name: "Australia" },
  { code: "AT", dial: "43", name: "Austria" },
  { code: "BD", dial: "880", name: "Bangladesh" },
  { code: "BE", dial: "32", name: "Belgium" },
  { code: "BR", dial: "55", name: "Brazil" },
  { code: "CA", dial: "1", name: "Canada" },
  { code: "CH", dial: "41", name: "Switzerland" },
  { code: "CL", dial: "56", name: "Chile" },
  { code: "CN", dial: "86", name: "China" },
  { code: "CO", dial: "57", name: "Colombia" },
  { code: "CZ", dial: "420", name: "Czechia" },
  { code: "DE", dial: "49", name: "Germany" },
  { code: "DK", dial: "45", name: "Denmark" },
  { code: "DZ", dial: "213", name: "Algeria" },
  { code: "EG", dial: "20", name: "Egypt" },
  { code: "ES", dial: "34", name: "Spain" },
  { code: "ET", dial: "251", name: "Ethiopia" },
  { code: "FI", dial: "358", name: "Finland" },
  { code: "FR", dial: "33", name: "France" },
  { code: "GB", dial: "44", name: "United Kingdom" },
  { code: "GH", dial: "233", name: "Ghana" },
  { code: "GR", dial: "30", name: "Greece" },
  { code: "HK", dial: "852", name: "Hong Kong" },
  { code: "HU", dial: "36", name: "Hungary" },
  { code: "ID", dial: "62", name: "Indonesia" },
  { code: "IE", dial: "353", name: "Ireland" },
  { code: "IL", dial: "972", name: "Israel" },
  { code: "IN", dial: "91", name: "India" },
  { code: "IS", dial: "354", name: "Iceland" },
  { code: "IT", dial: "39", name: "Italy" },
  { code: "JP", dial: "81", name: "Japan" },
  { code: "KE", dial: "254", name: "Kenya" },
  { code: "KR", dial: "82", name: "South Korea" },
  { code: "LK", dial: "94", name: "Sri Lanka" },
  { code: "MA", dial: "212", name: "Morocco" },
  { code: "MX", dial: "52", name: "Mexico" },
  { code: "MY", dial: "60", name: "Malaysia" },
  { code: "NG", dial: "234", name: "Nigeria" },
  { code: "NL", dial: "31", name: "Netherlands" },
  { code: "NO", dial: "47", name: "Norway" },
  { code: "NZ", dial: "64", name: "New Zealand" },
  { code: "PE", dial: "51", name: "Peru" },
  { code: "PH", dial: "63", name: "Philippines" },
  { code: "PK", dial: "92", name: "Pakistan" },
  { code: "PL", dial: "48", name: "Poland" },
  { code: "PT", dial: "351", name: "Portugal" },
  { code: "QA", dial: "974", name: "Qatar" },
  { code: "RO", dial: "40", name: "Romania" },
  { code: "RS", dial: "381", name: "Serbia" },
  { code: "RU", dial: "7", name: "Russia" },
  { code: "SA", dial: "966", name: "Saudi Arabia" },
  { code: "SE", dial: "46", name: "Sweden" },
  { code: "SG", dial: "65", name: "Singapore" },
  { code: "TH", dial: "66", name: "Thailand" },
  { code: "TR", dial: "90", name: "Turkey" },
  { code: "TW", dial: "886", name: "Taiwan" },
  { code: "TZ", dial: "255", name: "Tanzania" },
  { code: "UA", dial: "380", name: "Ukraine" },
  { code: "US", dial: "1", name: "United States" },
  { code: "VN", dial: "84", name: "Vietnam" },
  { code: "ZA", dial: "27", name: "South Africa" },
];

export const DEFAULT_COUNTRY: CountryOption =
  COUNTRIES.find((c) => c.code === "IN") ?? COUNTRIES[0];

/** flagcdn.com image for a country, e.g. flagUrl("IN") → .../w40/in.png */
export function flagUrl(code: string): string {
  return `https://flagcdn.com/w40/${code.toLowerCase()}.png`;
}

export function findCountryByCode(code: string): CountryOption | undefined {
  const upper = code.toUpperCase();
  return COUNTRIES.find((c) => c.code === upper);
}

export function findCountryByDial(dial: string): CountryOption | undefined {
  const clean = dial.replace(/^\+/, "");
  return COUNTRIES.find((c) => c.dial === clean);
}

/** Longest dial codes first so "+1…" matches "1" and not a longer fake prefix. */
const DIALS_BY_LENGTH: CountryOption[] = [...COUNTRIES].sort(
  (a, b) => b.dial.length - a.dial.length,
);

/**
 * Split a stored full number ("+919876543210") into dial + national digits.
 *
 * Numbers stored WITHOUT a leading "+" are ambiguous (is "1415…" the US
 * country code or part of the national number?), so they are left whole under
 * the current/default dial instead of guessing.
 */
export function splitPhoneNumber(full: string | null | undefined): {
  dial: string;
  national: string;
} {
  const raw = (full ?? "").trim();
  if (!raw) return { dial: `+${DEFAULT_COUNTRY.dial}`, national: "" };

  const plus = raw.startsWith("+");
  const digits = raw.replace(/[^0-9]/g, "");
  if (!plus) return { dial: `+${DEFAULT_COUNTRY.dial}`, national: digits };

  for (const country of DIALS_BY_LENGTH) {
    if (digits.startsWith(country.dial) && digits.length > country.dial.length) {
      return { dial: `+${country.dial}`, national: digits.slice(country.dial.length) };
    }
  }
  // Unknown dial code (not in our list) — keep everything under "+"" so the
  // value round-trips untouched.
  return { dial: "+", national: digits };
}

/** Compose dial + national entry into the E.164-ish string the API expects. */
export function composePhoneNumber(dial: string, national: string): string {
  const digits = national.replace(/[^0-9]/g, "");
  const cleanDial = dial.replace(/[^0-9]/g, "");
  return `+${cleanDial}${digits}`;
}

/**
 * Absorb raw keystrokes/paste from the national-number input.
 *
 * If the user types or pastes a full number starting with "+", the country
 * dial code is re-detected and moved into the dropdown; otherwise the current
 * selection is kept and only digits are retained.
 */
export function absorbPhoneInput(
  raw: string,
  currentDial: string,
): { dial: string; national: string } {
  if (raw.trim().startsWith("+")) {
    return splitPhoneNumber(raw);
  }
  return { dial: currentDial, national: raw.replace(/[^0-9]/g, "") };
}

/** Countries whose name/code/dial match a search query (for the dropdown). */
export function searchCountries(query: string): CountryOption[] {
  const q = query.trim().toLowerCase();
  if (!q) return COUNTRIES;
  const digits = q.replace(/[^0-9]/g, "");
  return COUNTRIES.filter(
    (c) =>
      c.name.toLowerCase().includes(q) ||
      c.code.toLowerCase().includes(q) ||
      (digits.length > 0 && c.dial.includes(digits)),
  );
}
