"use client";

import { useState } from "react";
import Image from "next/image";
import dynamic from "next/dynamic";
import { useRouter } from "next/navigation";
import { useAuth } from "@/lib/auth-context";

const LoginModal = dynamic(() => import("@/components/ui/LoginModal"), {
  ssr: false,
});

/* ─── copy ─── */
const headline = "Your Perfect Look Awaits";

const subtext =
  "Discover personalized beauty treatments crafted by our expert team. From rejuvenating facials to transformative lifts, we bring out your natural radiance.";

const totalSlides = 3;

export default function HeroSection() {
  const { isAuthenticated } = useAuth();
  const router = useRouter();
  const [activeSlide, setActiveSlide] = useState(0);
  const [loginOpen, setLoginOpen] = useState(false);
  const [authMode, setAuthMode] = useState<"signin" | "signup">("signin");

  const words = headline.split(" ");
  const mid = Math.ceil(words.length / 2);
  const line1 = words.slice(0, mid);
  const line2 = words.slice(mid);

  const handleBookClick = () => {
    if (!isAuthenticated) {
      setAuthMode("signup");
      setLoginOpen(true);
      return;
    }

    router.push("/booking");
  };

  return (
    <>
      <section className="relative -mt-24 flex h-[calc(100vh+6rem)] w-full overflow-hidden">
      {/* ── Left Panel: Warm Ivory background ── */}
      <div className="relative z-10 flex w-full flex-col justify-center px-6 py-24 md:w-[55%] md:px-12 lg:w-[50%] lg:px-20" style={{ backgroundColor: 'var(--bg-primary)' }}>
        <div className="max-w-xl">
          {/* Uppercase label */}
          <span className="mb-4 inline-block rounded-full px-4 py-1.5 text-xs font-semibold uppercase tracking-widest" style={{ backgroundColor: 'var(--bg-secondary)', color: 'var(--accent-primary)' }}>
            Your Feel Fresh:
          </span>

          {/* Headline — two lines */}
          <h1 className="mt-5 font-serif text-5xl font-bold leading-[1.1] tracking-tight md:text-6xl lg:text-7xl" style={{ color: 'var(--text-primary)' }}>
            <span className="block">
              {line1.map((word, idx) => (
                <span key={`l1-${idx}`} className="inline-block">
                  {word}{" "}
                </span>
              ))}
            </span>
            <span className="block">
              {line2.map((word, idx) => (
                <span key={`l2-${idx}`} className="inline-block">
                  {word}{" "}
                </span>
              ))}
            </span>
          </h1>

          {/* Subtext */}
          <p className="mt-6 max-w-md text-base leading-relaxed md:text-lg" style={{ color: 'var(--text-muted)' }}>
            {subtext}
          </p>

          {/* CTA */}
          <div className="mt-10 flex items-center gap-4">
            <button
              type="button"
              onClick={handleBookClick}
              className="inline-flex items-center justify-center rounded-full px-8 py-3.5 text-sm font-semibold text-white shadow-lg transition-all duration-300 hover:shadow-xl hover:scale-[1.02] active:scale-[0.98]"
              style={{ backgroundColor: 'var(--accent-primary)' }}
            >
              Book Appointment
            </button>
            <button
              onClick={() => {
                setAuthMode("signin");
                setLoginOpen(true);
              }}
              className="inline-flex items-center justify-center rounded-full border px-8 py-3.5 text-sm font-semibold shadow-lg transition-all duration-300 hover:shadow-xl hover:scale-[1.02] active:scale-[0.98]"
              style={{ color: 'var(--text-primary)', borderColor: 'var(--border-color)', backgroundColor: 'transparent' }}
            >
              Sign In
            </button>
          </div>

          {/* Carousel dots — below CTA */}
          <div className="mt-8 flex items-center gap-2">
            {Array.from({ length: totalSlides }).map((_, i) => (
              <button
                key={i}
                onClick={() => setActiveSlide(i)}
                className="h-2.5 rounded-full transition-all duration-300"
                style={{
                  width: i === activeSlide ? '2rem' : '0.625rem',
                  backgroundColor: i === activeSlide ? 'var(--text-primary)' : 'var(--border-color)',
                }}
                aria-label={`Go to slide ${i + 1}`}
              />
            ))}
          </div>
        </div>
      </div>

      {/* ── Right Panel: Hero image with fade gradient ── */}
      <div className="relative hidden w-[45%] md:block lg:w-[50%]">
        {/* Gradient overlay on left edge — blends into blush-pink */}
        <div
          className="absolute inset-y-0 left-0 z-20 w-32 md:w-48 lg:w-64"
          style={{
            background:
              "linear-gradient(to right, var(--bg-primary) 0%, var(--bg-primary) 15%, rgba(245,241,234,0.8) 40%, rgba(245,241,234,0.3) 70%, transparent 100%)",
          }}
        />

        {/* Hero image */}
        <Image
          src="/images/hero-beauty.png"
          alt="Smiling woman with radiant skin — beauty treatment results"
          fill
          className="object-cover object-[center_20%]"
          sizes="(max-width: 768px) 100vw, 50vw"
          priority
        />
      </div>

      {/* ── Mobile fallback: decorative background image ── */}
      <div className="absolute inset-0 z-0 md:hidden">
        <Image
          src="/images/hero-beauty.png"
          alt=""
          aria-hidden="true"
          fill
          className="object-cover object-center opacity-20"
          sizes="100vw"
          priority
        />
        <div className="absolute inset-0 bg-gradient-to-b from-beige-50/90 via-beige-50/80 to-beige-50" />
      </div>
      </section>
      <LoginModal open={loginOpen} onClose={() => setLoginOpen(false)} initialMode={authMode} />
    </>
  );
}
