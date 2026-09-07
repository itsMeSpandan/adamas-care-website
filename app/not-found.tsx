import Link from "next/link";
import { BRAND } from "@/lib/brand";

const quickLinks = [
  { label: "Home", href: "/" },
  { label: "Services", href: "/services" },
  { label: "Team", href: "/team" },
  { label: "Book Now", href: "/booking" },
  { label: "About", href: "/about" },
  { label: "Contact", href: "/contact" },
];

export default function NotFound() {
  return (
    <div className="flex min-h-[70vh] flex-col items-center justify-center bg-beige-50 px-4 text-center">
      {/* Animated 404 illustration */}
      <div className="relative mb-8">
        <svg
          width="180"
          height="180"
          viewBox="0 0 180 180"
          fill="none"
          className="drop-shadow-sm"
        >
          {/* Outer circle */}
          <circle
            cx="90"
            cy="90"
            r="80"
            stroke="#e8ddd3"
            strokeWidth="2"
            strokeDasharray="6 4"
            className="origin-center animate-spin"
            style={{ animationDuration: "30s" }}
          />
          {/* Inner circle */}
          <circle cx="90" cy="90" r="56" fill="#faf6f1" stroke="#e8ddd3" strokeWidth="1.5" />
          {/* Question mark */}
          <text
            x="90"
            y="105"
            textAnchor="middle"
            fontFamily="var(--font-cormorant), serif"
            fontSize="60"
            fontWeight="600"
            fill="#c9b8a8"
          >
            ?
          </text>
          {/* Decorative dots */}
          <circle cx="30" cy="40" r="3" fill="#e8ddd3" />
          <circle cx="150" cy="50" r="2" fill="#e8ddd3" />
          <circle cx="25" cy="130" r="2.5" fill="#e8ddd3" />
          <circle cx="155" cy="140" r="2" fill="#e8ddd3" />
        </svg>
      </div>

      {/* Error code */}
      <span className="font-serif text-7xl font-bold tracking-tight text-beige-300 sm:text-8xl">
        404
      </span>

      <h1 className="mt-4 font-serif text-3xl font-semibold text-beige-700 md:text-4xl">
        Page Not Found
      </h1>
      <p className="mt-3 max-w-md text-beige-600">
        The page you&apos;re looking for doesn&apos;t exist or has been moved.
        Let&apos;s get you back on track.
      </p>

      {/* Quick links */}
      <div className="mt-8 flex flex-wrap justify-center gap-3">
        {quickLinks.map((link) => (
          <Link
            key={link.href}
            href={link.href}
            className="rounded-full border border-beige-300 bg-white px-4 py-2 text-sm font-medium text-beige-700 transition-all duration-200 hover:border-beige-500 hover:bg-beige-100 hover:shadow-sm"
          >
            {link.label}
          </Link>
        ))}
      </div>

      {/* Contact note */}
      <p className="mt-10 text-xs text-beige-400">
        If you believe this is a mistake, please{" "}
        <a
          href={`mailto:${BRAND.email}`}
          className="underline underline-offset-2 transition-colors hover:text-beige-600"
        >
          contact us
        </a>
        .
      </p>
    </div>
  );
}
