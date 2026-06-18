import Link from "next/link";
import { BRAND } from "@/lib/brand";

const quickLinks = [
  { href: "/", label: "Home" },
  { href: "/services", label: "Services" },
  { href: "/team", label: "Our Team" },
  { href: "/about", label: "About" },
  { href: "/contact", label: "Contact" },
];

const serviceLinks = [
  { href: "/services/precision-haircut", label: "Haircuts & Styling" },
  { href: "/services/color-gloss-treatment", label: "Color & Gloss" },
  { href: "/services/hydra-facial", label: "Facials & Skincare" },
  { href: "/services/gel-manicure", label: "Manicure & Nail Art" },
  { href: "/services/deep-tissue-massage", label: "Massage Therapy" },
  { href: "/services/bridal-glam-package", label: "Bridal Services" },
];

export default function Footer() {
  return (
    <footer className="bg-beige-900 text-beige-200">
      <div className="section-container section-padding">
        <div className="grid grid-cols-1 gap-12 md:grid-cols-2 lg:grid-cols-4">
          {/* Column 1: Logo + tagline */}
          <div>
            <span className="font-serif text-2xl font-semibold italic text-beige-100">
              {BRAND.name}
            </span>
            <p className="mt-3 text-sm leading-relaxed text-beige-300">
              Where luxury meets tranquility. Discover your most radiant self
              with our expert team of beauty professionals.
            </p>
          </div>

          {/* Column 2: Quick links */}
          <div>
            <h4 className="mb-4 font-serif text-base font-semibold text-beige-100">
              Quick Links
            </h4>
            <ul className="space-y-2">
              {quickLinks.map((link) => (
                <li key={link.href}>
                  <Link
                    href={link.href}
                    className="text-sm text-beige-300 transition-colors hover:text-beige-100"
                  >
                    {link.label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          {/* Column 3: Services */}
          <div>
            <h4 className="mb-4 font-serif text-base font-semibold text-beige-100">
              Services
            </h4>
            <ul className="space-y-2">
              {serviceLinks.map((link) => (
                <li key={link.href}>
                  <Link
                    href={link.href}
                    className="text-sm text-beige-300 transition-colors hover:text-beige-100"
                  >
                    {link.label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          {/* Column 4: Contact */}
          <div>
            <h4 className="mb-4 font-serif text-base font-semibold text-beige-100">
              Contact
            </h4>
            <ul className="space-y-2 text-sm text-beige-300">
              <li className="whitespace-pre-line leading-relaxed">{BRAND.address}</li>
              <li className="pt-2">
                <a
                  href="tel:+9238381831"
                  className="transition-colors hover:text-beige-100"
                >
                  +91 9238381831
                </a>
              </li>
              <li>
                <a
                  href={`mailto:${BRAND.email}`}
                  className="transition-colors hover:text-beige-100"
                >
                  {BRAND.email}
                </a>
              </li>
            </ul>
          </div>
        </div>
      </div>

      {/* Map embed */}
      <div className="border-t border-beige-800">
        <div className="section-container">
          <div className="overflow-hidden rounded-xl border border-beige-800">
            <iframe
              title={`Map of ${BRAND.name}`}
              src={`https://maps.google.com/maps?q=${encodeURIComponent(BRAND.address)}&t=&z=15&ie=UTF8&iwloc=&output=embed`}
              width="100%"
              height="250"
              style={{ border: 0 }}
              allowFullScreen
              loading="lazy"
              referrerPolicy="no-referrer-when-downgrade"
            />
          </div>
        </div>
      </div>

      {/* Bottom bar */}
      <div className="border-t border-beige-800">
        <div className="section-container mx-auto flex flex-col items-center justify-between gap-4 px-4 py-6 md:flex-row md:px-8">
          <p className="text-xs text-beige-400">
            &copy; {new Date().getFullYear()} {BRAND.name}. All rights
            reserved.
          </p>
          <div className="flex items-center gap-4">
            {/* Instagram */}
            <a
              href="https://instagram.com"
              target="_blank"
              rel="noopener noreferrer"
              aria-label="Instagram"
              className="text-beige-400 transition-colors hover:text-beige-200"
            >
              <svg
                width="18"
                height="18"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <rect width="20" height="20" x="2" y="2" rx="5" ry="5" />
                <path d="M16 11.37A4 4 0 1 1 12.63 8 4 4 0 0 1 16 11.37z" />
                <line x1="17.5" x2="17.51" y1="6.5" y2="6.5" />
              </svg>
            </a>
            {/* Facebook */}
            <a
              href="https://facebook.com"
              target="_blank"
              rel="noopener noreferrer"
              aria-label="Facebook"
              className="text-beige-400 transition-colors hover:text-beige-200"
            >
              <svg
                width="18"
                height="18"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <path d="M18 2h-3a5 5 0 0 0-5 5v3H7v4h3v8h4v-8h3l1-4h-4V7a1 1 0 0 1 1-1h3z" />
              </svg>
            </a>
          </div>
        </div>
      </div>
    </footer>
  );
}
