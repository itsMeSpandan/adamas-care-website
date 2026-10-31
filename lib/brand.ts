/**
 * Single source of truth for all brand-related constants.
 * Change the brand name here and it updates everywhere.
 */
export const BRAND = {
  name: "Adamas Care",
  tagline: "Luxury Beauty & Wellness",
  domain: "adamas-care.netlify.app",
  baseUrl: "https://adamas-care.netlify.app",
  phone: "+91 9830080129",
  email: "hello@adamas-care.netlify.app",
  address: "Barasat-Barrackpore Road, Barbaria, P.O Jagannathpur, District-24 Parganas (North), Kolkata-700 126, West Bengal, India",
  get title() {
    return `${this.name} | ${this.tagline}`;
  },
} as const;
