/**
 * Single source of truth for all brand-related constants.
 * Change the brand name here and it updates everywhere.
 */
export const BRAND = {
  name: "Adamas Care",
  tagline: "Luxury Beauty & Wellness",
  domain: "adamascare.com",
  baseUrl: "https://adamascare.com",
  email: "hello@adamascare.in",
  address: "Barasat-Barrackpore Road, Barbaria, P.O Jagannathpur, District-24 Parganas (North), Kolkata-700 126, West Bengal, India",
  get title() {
    return `${this.name} | ${this.tagline}`;
  },
} as const;
