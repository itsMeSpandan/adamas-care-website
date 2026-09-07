/**
 * Single source of truth for all brand-related constants.
 * Change the brand name here and it updates everywhere.
 */
export const BRAND = {
  name: "Grace Salon",
  tagline: "Luxury Beauty & Wellness",
  domain: "gracesalon.com",
  baseUrl: "https://gracesalon.com",
  email: "hello@gracesalon.com",
  address: "Barasat-Barrackpore Road, Barbaria, P.O Jagannathpur, District-24 Parganas (North), Kolkata-700 126, West Bengal, India",
  get title() {
    return `${this.name} | ${this.tagline}`;
  },
} as const;
