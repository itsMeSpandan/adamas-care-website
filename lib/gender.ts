export type Gender = "female" | "male" | "other";

export interface GenderOption {
  value: Gender;
  label: string;
  symbol: string;
}

export const GENDERS: readonly GenderOption[] = [
  { value: "female", label: "Female", symbol: "♀" },
  { value: "male", label: "Male", symbol: "♂" },
  { value: "other", label: "Other", symbol: "⚧" },
] as const;

export const GENDER_VALUES = ["female", "male", "other"] as const;

export function isValidGender(value: unknown): value is Gender {
  return typeof value === "string" && GENDER_VALUES.includes(value as Gender);
}
