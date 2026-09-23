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
    <footer style={{ backgroundColor: 'var(--footer-bg)' }}>
      <div className="section-container section-padding">
        <div className="grid grid-cols-1 gap-12 md:grid-cols-2 lg:grid-cols-4">
          {/* Column 1: Logo + tagline */}
          <div>
            <span className="font-serif text-2xl font-semibold italic" style={{ color: 'var(--footer-text)' }}>
              {BRAND.name}
            </span>
            <p className="mt-3 text-sm leading-relaxed" style={{ color: 'var(--footer-text)', opacity: 0.8 }}>
              A salon where the specialists know your name, your hair type,
              and that you hate being late. We book by the service, not the clock.
            </p>
          </div>

          {/* Column 2: Quick links */}
          <div>
            <h4 className="mb-4 font-serif text-base font-semibold" style={{ color: 'var(--footer-text)' }}>
              Quick Links
            </h4>
            <ul className="space-y-2">
              {quickLinks.map((link) => (
                <li key={link.href}>
                  <Link
                    href={link.href}
                    className="text-sm transition-colors hover:opacity-80"
                    style={{ color: 'var(--footer-link)' }}
                  >
                    {link.label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          {/* Column 3: Services */}
          <div>
            <h4 className="mb-4 font-serif text-base font-semibold" style={{ color: 'var(--footer-text)' }}>
              Services
            </h4>
            <ul className="space-y-2">
              {serviceLinks.map((link) => (
                <li key={link.href}>
                  <Link
                    href={link.href}
                    className="text-sm transition-colors hover:opacity-80"
                    style={{ color: 'var(--footer-link)' }}
                  >
                    {link.label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          {/* Column 4: Contact */}
          <div>
            <h4 className="mb-4 font-serif text-base font-semibold" style={{ color: 'var(--footer-text)' }}>
              Contact
            </h4>
            <ul className="space-y-2 text-sm" style={{ color: 'var(--footer-text)', opacity: 0.8 }}>
              <li className="whitespace-pre-line leading-relaxed">{BRAND.address}</li>
              <li className="pt-2">
                <a
                  href="tel:+919238381831"
                  className="transition-colors hover:opacity-80"
                  style={{ color: 'var(--footer-link)' }}
                >
                  +91 9238381831
                </a>
              </li>
              <li>
                <a
                  href={`mailto:${BRAND.email}`}
                  className="transition-colors hover:opacity-80"
                  style={{ color: 'var(--footer-link)' }}
                >
                  {BRAND.email}
                </a>
              </li>
            </ul>
          </div>
        </div>
      </div>

      {/* Map embed */}
      <div className="border-t" style={{ borderColor: 'rgba(245,241,234,0.2)' }}>
        <div className="section-container">
          <div className="overflow-hidden rounded-xl border" style={{ borderColor: 'rgba(245,241,234,0.2)' }}>
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
      <div className="border-t" style={{ borderColor: 'rgba(245,241,234,0.2)' }}>
        <div className="section-container mx-auto flex flex-col items-center justify-between gap-4 px-4 py-6 md:flex-row md:px-8">
          <p className="text-xs" style={{ color: 'var(--footer-text)', opacity: 0.6 }}>
            &copy; {new Date().getFullYear()} {BRAND.name}. All rights
            reserved. ·
            <Link href="/privacy" className="ml-1 transition-colors hover:opacity-80" style={{ color: 'var(--footer-link)' }}>Privacy</Link>
            {' · '}
            <Link href="/terms" className="transition-colors hover:opacity-80" style={{ color: 'var(--footer-link)' }}>Terms</Link>
          </p>
          <div className="flex items-center gap-4">
            {/* WhatsApp — links to chat with the salon */}
            <a
              href="https://wa.me/919238381831"
              target="_blank"
              rel="noopener noreferrer"
              aria-label="Chat on WhatsApp"
              className="transition-colors hover:opacity-80"
              style={{ color: 'var(--footer-link)' }}
            >
              <svg
                width="18"
                height="18"
                viewBox="0 0 24 24"
                fill="currentColor"
              >
                <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/>
              </svg>
            </a>
          </div>
        </div>
      </div>
    </footer>
  );
}
