/**
 * Single source of truth for all brand-related constants.
 * Change the brand name here and it updates everywhere.
 */
export const BRAND = {
  name: "Adamas Care",
  tagline: "Luxury Beauty & Wellness",
  domain: "adamascare.com",
  baseUrl: "https://adamascare.com",
  email: "hello@adamascare.com",
  address: "123 Beauty Lane, NYC",
  get title() {
    return `${this.name} | ${this.tagline}`;
  },
} as const;
