"use client";

import { useEffect, useRef } from "react";
import { animate, createTimeline, stagger } from "animejs";
import Image from "next/image";
import Link from "next/link";

/* ─── headline copy (two lines per spec) ─── */
const headlineWords = [
  "Relax into your best self".split(" "),
  "Beauty & wellness, unhurried".split(" "),
];

const subtext =
  "Experience the art of beauty at Adamas Care. Our team of expert stylists and therapists deliver bespoke treatments that leave you feeling radiant, confident, and renewed.";

export default function HeroSection() {
  const headlineRef = useRef<HTMLHeadingElement>(null);
  const subtextRef = useRef<HTMLParagraphElement>(null);
  const ctaGroupRef = useRef<HTMLDivElement>(null);
  const illustrationRef = useRef<HTMLDivElement>(null);

  /* Check prefers-reduced-motion once at mount (static — acceptable for one-shot load anim) */
  const prefersReducedMotion =
    typeof window !== "undefined"
      ? window.matchMedia("(prefers-reduced-motion: reduce)").matches
      : false;

  useEffect(() => {
    if (prefersReducedMotion) return;

    const wordEls = headlineRef.current?.querySelectorAll(".hero-word");
    if (!wordEls?.length) return;

    /* Timeline: headline → subtext → CTAs */
    const tl = createTimeline({ defaults: { ease: "outExpo" } });

    // Headline words stagger in
    tl.add(Array.from(wordEls), {
      opacity: [0, 1],
      translateY: [24, 0],
      duration: 600,
      delay: stagger(60),
    });

    // Subtext fades up after headline settles
    tl.add(
      subtextRef.current!,
      {
        opacity: [0, 1],
        translateY: [16, 0],
        duration: 500,
      },
      "-=200"
    );

    // CTAs fade/scale in last
    tl.add(
      ctaGroupRef.current!,
      {
        opacity: [0, 1],
        translateY: [12, 0],
        scale: [0.97, 1],
        duration: 450,
      },
      "-=250"
    );

    /* Illustration — separate slower entrance, starts roughly parallel with headline */
    const illustrationAnim = animate(illustrationRef.current!, {
      opacity: [0, 1],
      translateY: [32, 0],
      duration: 800,
      ease: "outExpo",
      delay: 100,
    });

    /* Cleanup: pause all animations on unmount */
    return () => {
      tl.pause();
      illustrationAnim.pause();
    };
  }, [prefersReducedMotion]);

  return (
    <section className="relative flex min-h-[90vh] items-center bg-beige-50 px-4 py-20 md:px-8 lg:px-16">
      <div className="section-container mx-auto grid items-center gap-12 lg:grid-cols-2">
        {/* ── Left: text + CTAs ── */}
        <div className="max-w-xl">
          {/* Headline */}
          <h1
            ref={headlineRef}
            className="font-serif text-5xl font-medium leading-tight text-beige-700 md:text-6xl lg:text-7xl"
          >
            {headlineWords.map((line, lineIdx) => (
              <span key={lineIdx} className="block">
                {line.map((word, wordIdx) => (
                  <span
                    key={`${lineIdx}-${wordIdx}`}
                    className="hero-word inline-block"
                    style={{ opacity: prefersReducedMotion ? 1 : 0 }}
                  >
                    {word}{" "}
                  </span>
                ))}
              </span>
            ))}
          </h1>

          {/* Subtext */}
          <p
            ref={subtextRef}
            className="mt-6 max-w-[48ch] text-lg leading-relaxed text-beige-800"
            style={{ opacity: prefersReducedMotion ? 1 : 0 }}
          >
            {subtext}
          </p>

          {/* CTAs */}
          <div
            ref={ctaGroupRef}
            className="mt-8 flex flex-wrap gap-4"
            style={{ opacity: prefersReducedMotion ? 1 : 0 }}
          >
            <Link href="/booking" className="btn-primary px-8 py-3.5 text-base">
              Book appointment
            </Link>
            <Link
              href="/services"
              className="btn-outline px-8 py-3.5 text-base"
            >
              View services
            </Link>
          </div>
        </div>

        {/* ── Right: illustration ── */}
        <div
          ref={illustrationRef}
          className="relative mx-auto flex h-[480px] w-full max-w-[420px] items-center justify-center lg:h-[560px] lg:max-w-none"
          style={{ opacity: prefersReducedMotion ? 1 : 0 }}
        >
          <Image
            src="/images/hero-illustration.png"
            alt="Relaxing spa day — woman in robe with cucumber face mask"
            fill
            className="object-contain"
            sizes="(max-width: 1024px) 80vw, 420px"
            priority
          />
        </div>
      </div>
    </section>
  );
}
