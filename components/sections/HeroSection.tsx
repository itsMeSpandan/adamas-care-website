"use client";

import { useState } from "react";
import { motion } from "framer-motion";
import dynamic from "next/dynamic";
import HeroCarousel from "@/components/ui/HeroCarousel";

const LoginModal = dynamic(() => import("@/components/ui/LoginModal"), {
  ssr: false,
});

/* ─── copy ─── */
const headline = "Hair That Moves. Skin That Glows.";

const subtext =
  "Precision cuts, colour that lasts, and facials that actually change your skin — done by specialists who remember your name and your last appointment.";

export default function HeroSection() {
  const [loginOpen, setLoginOpen] = useState(false);
  const [loginMode, setLoginMode] = useState<"signin" | "signup">("signup");

  const words = headline.split(" ");
  const mid = Math.ceil(words.length / 2);
  const line1 = words.slice(0, mid);
  const line2 = words.slice(mid);

  const handleBookClick = () => {
    setLoginMode("signup");
    setLoginOpen(true);
  };

  return (
    <>
      <section className="relative flex flex-col w-full h-[calc(100dvh-88px)] min-h-[calc(100dvh-88px)] overflow-hidden md:h-auto md:min-h-[calc(100vh-88px)] md:flex-row">
        {/* ── Left Panel: Warm Ivory background with text ── */}
        <div
          className="relative z-10 flex w-full shrink-0 flex-col justify-center px-5 pt-4 pb-2 sm:px-8 sm:py-8 md:w-[55%] md:px-12 md:py-24 lg:w-[50%] lg:px-20"
          style={{ backgroundColor: "var(--bg-primary)" }}
        >
          <div className="max-w-xl">
            {/* Headline — staggered word reveal */}
            <h1
              className="font-serif text-[1.75rem] font-bold leading-[1.12] tracking-tight sm:text-5xl md:text-6xl lg:text-7xl"
              style={{ color: "var(--text-primary)" }}
            >
              <span className="block">
                {line1.map((word, idx) => (
                  <motion.span
                    key={`l1-${idx}`}
                    className="inline-block overflow-hidden"
                  >
                    <motion.span
                      className="inline-block"
                      initial={{ y: "110%" }}
                      animate={{ y: 0 }}
                      transition={{
                        duration: 0.7,
                        delay: 0.3 + idx * 0.12,
                        ease: [0.22, 1, 0.36, 1],
                      }}
                    >
                      {word}
                    </motion.span>
                    <span className="inline-block w-[0.3em]">&nbsp;</span>
                  </motion.span>
                ))}
              </span>
              <span className="block">
                {line2.map((word, idx) => (
                  <motion.span
                    key={`l2-${idx}`}
                    className="inline-block overflow-hidden"
                  >
                    <motion.span
                      className="inline-block"
                      initial={{ y: "110%" }}
                      animate={{ y: 0 }}
                      transition={{
                        duration: 0.7,
                        delay: 0.6 + idx * 0.12,
                        ease: [0.22, 1, 0.36, 1],
                      }}
                    >
                      {word}
                    </motion.span>
                    <span className="inline-block w-[0.3em]">&nbsp;</span>
                  </motion.span>
                ))}
              </span>
            </h1>

            {/* Subtext — delayed fade in */}
            <motion.p
              className="mt-2 sm:mt-6 max-w-md text-xs sm:text-base md:text-lg leading-relaxed"
              style={{ color: "var(--text-muted)" }}
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: 1.0, ease: "easeOut" }}
            >
              {subtext}
            </motion.p>

            {/* CTA — delayed fade in */}
            <motion.div
              className="mt-3.5 sm:mt-10 flex items-center gap-3 sm:gap-4"
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, delay: 1.2, ease: "easeOut" }}
            >
              <button
                type="button"
                onClick={handleBookClick}
                className="inline-flex items-center justify-center rounded-full px-5 py-2.5 text-xs sm:px-8 sm:py-3.5 sm:text-sm font-semibold text-white shadow-lg transition-all duration-300 hover:shadow-xl hover:scale-[1.02] active:scale-[0.98]"
                style={{ backgroundColor: "var(--accent-primary)" }}
              >
                Book Appointment
              </button>
              <button
                onClick={() => { setLoginMode("signin"); setLoginOpen(true); }}
                className="inline-flex items-center justify-center rounded-full border px-5 py-2.5 text-xs sm:px-8 sm:py-3.5 sm:text-sm font-semibold shadow-lg transition-all duration-300 hover:shadow-xl hover:scale-[1.02] active:scale-[0.98]"
                style={{
                  color: "var(--text-primary)",
                  borderColor: "var(--border-color)",
                  backgroundColor: "transparent",
                }}
              >
                Sign In
              </button>
            </motion.div>
          </div>
        </div>

        {/* ── Right Panel: Hero Carousel (desktop) ── */}
        <div className="relative hidden w-[45%] md:block lg:w-[50%]">
          {/* Gradient overlay on left edge — blends into ivory */}
          <div
            className="pointer-events-none absolute inset-y-0 left-0 z-20 w-32 md:w-48 lg:w-64"
            style={{
              background:
                "linear-gradient(to right, var(--bg-primary) 0%, var(--bg-primary) 15%, rgba(245,241,234,0.8) 40%, rgba(245,241,234,0.3) 70%, transparent 100%)",
            }}
          />

          {/* Hero carousel — slide in from right */}
          <motion.div
            className="absolute inset-0"
            initial={{ x: 60, opacity: 0 }}
            animate={{ x: 0, opacity: 1 }}
            transition={{ duration: 1.0, delay: 0.2, ease: [0.22, 1, 0.36, 1] }}
          >
            <HeroCarousel priority={true} />
          </motion.div>
        </div>

        {/* ── Mobile: Hero Carousel below text ── */}
        <div className="relative flex-1 min-h-0 w-full md:hidden">
          {/* Gradient overlay on top edge — blends into ivory */}
          <div
            className="pointer-events-none absolute inset-x-0 top-0 z-20 h-16 sm:h-24"
            style={{
              background:
                "linear-gradient(to bottom, var(--bg-primary) 0%, var(--bg-primary) 15%, rgba(245,241,234,0.8) 40%, rgba(245,241,234,0.3) 70%, transparent 100%)",
            }}
          />

          <HeroCarousel priority={true} />
        </div>
      </section>
      <LoginModal open={loginOpen} onClose={() => setLoginOpen(false)} initialMode={loginMode} />
    </>
  );
}
