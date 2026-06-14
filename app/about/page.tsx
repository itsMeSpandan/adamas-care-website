"use client";

import { motion } from "framer-motion";
import Image from "next/image";
import { BRAND } from "@/lib/brand";
import BookingCTA from "@/components/sections/BookingCTA";

const values = [
  {
    title: "Artistry",
    description:
      "We approach every treatment as a craft, blending technical precision with creative vision to deliver results that inspire.",
    icon: (
      <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" className="text-beige-400">
        <circle cx="13.5" cy="6.5" r="2.5" />
        <path d="M17.18 11.93A7.001 7.001 0 0 0 6 6.5a7 7 0 0 0 4.5 6.6" />
        <path d="M5 19.5c3.17-1.47 5.74-3.5 7.5-7.5" />
        <path d="M19.5 15.5c-1.5 1-3.5 2.5-5.5 4" />
      </svg>
    ),
  },
  {
    title: "Wellness",
    description:
      "True beauty radiates from within. Our holistic approach nurtures both body and mind for lasting radiance.",
    icon: (
      <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" className="text-beige-400">
        <path d="M19 14c1.49-1.46 3-3.21 3-5.5A5.5 5.5 0 0 0 16.5 3c-1.76 0-3 .5-4.5 2-1.5-1.5-2.74-2-4.5-2A5.5 5.5 0 0 0 2 8.5c0 2.3 1.5 4.05 3 5.5l7 7Z" />
      </svg>
    ),
  },
  {
    title: "Community",
    description:
      `${BRAND.name} is more than a salon — it's a gathering place where connections are made and everyone belongs.`,
    icon: (
      <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" className="text-beige-400">
        <path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2" />
        <circle cx="9" cy="7" r="4" />
        <path d="M22 21v-2a4 4 0 0 0-3-3.87" />
        <path d="M16 3.13a4 4 0 0 1 0 7.75" />
      </svg>
    ),
  },
];

const timeline = [
  {
    year: "2012",
    title: "A Dream Takes Shape",
    description:
      `Founder Isabelle Laurent opens the first ${BRAND.name} studio in a cozy 800 sq ft space with just two chairs and a dream of redefining salon culture.`,
  },
  {
    year: "2015",
    title: "Expanding Our Vision",
    description:
      `${BRAND.name} moves to its current flagship location on Blossom Lane, doubling in size and launching our skincare and body treatment offerings.`,
  },
  {
    year: "2018",
    title: "Award-Winning Excellence",
    description:
      "Recognized as Best Salon & Spa by Serenity Falls Magazine. Our team grows to 12 specialists covering hair, skin, nails, and wellness.",
  },
  {
    year: "2021",
    title: "Bridal & Beyond",
    description:
      `Launch of our dedicated Bridal Suite and pre-wedding programs. ${BRAND.name} becomes the go-to destination for brides-to-be in the region.`,
  },
  {
    year: "2024",
    title: "A New Chapter",
    description:
      "Introduction of our advanced facial technologies and sustainable product partnerships. The journey of artistry and wellness continues.",
  },
];

export default function AboutPage() {
  return (
    <>
      {/* Hero banner */}
      <section className="section-padding bg-beige-100">
        <div className="section-container mx-auto max-w-3xl text-center">
          <motion.h1
            initial={{ opacity: 0, y: 24 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
            className="font-serif text-4xl font-semibold text-beige-700 md:text-5xl lg:text-6xl"
          >
            About {BRAND.name}
          </motion.h1>
          <motion.p
            initial={{ opacity: 0, y: 24 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.1 }}
            className="mt-6 font-serif text-xl italic leading-relaxed text-beige-600"
          >
            &ldquo;Beauty is not about perfection. It&apos;s about the moments
            of care, the ritual of renewal, and the art of feeling truly
            yourself.&rdquo;
          </motion.p>
        </div>
      </section>

      {/* Our story */}
      <section className="section-padding bg-beige-50">
        <div className="section-container mx-auto grid items-center gap-12 lg:grid-cols-2">
          <motion.div
            initial={{ opacity: 0, y: 24 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, margin: "-100px" }}
            transition={{ duration: 0.5 }}
          >
            <h2 className="mb-6 font-serif text-3xl font-semibold text-beige-700">
              Our Story
            </h2>
            <p className="mb-4 leading-relaxed text-beige-800">
              {BRAND.name} was born from a simple belief: that everyone deserves a
              space where they feel seen, pampered, and beautifully themselves.
              Founded in 2012 by master stylist Isabelle Laurent, our salon has
              grown from a small studio into a full-service beauty sanctuary.
            </p>
            <p className="leading-relaxed text-beige-800">
              Every detail of {BRAND.name} — from the warm beige tones of our
              interiors to the curated selection of products on our shelves —
              has been thoughtfully chosen to create an atmosphere of calm
              luxury. We believe that the experience of beauty should be as
              beautiful as the results.
            </p>
          </motion.div>
          <motion.div
            initial={{ opacity: 0, y: 24 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, margin: "-100px" }}
            transition={{ duration: 0.5, delay: 0.15 }}
            className="relative aspect-[4/3] overflow-hidden rounded-card"
          >
            <Image
              src="https://images.unsplash.com/photo-1521590832167-7bcbfaa6381f?w=800&q=80"
              alt={`${BRAND.name} salon interior`}
              fill
              className="object-cover"
              sizes="(max-width: 1024px) 100vw, 50vw"
            />
          </motion.div>
        </div>
      </section>

      {/* Values */}
      <section className="section-padding bg-beige-100">
        <div className="section-container mx-auto">
          <motion.h2
            initial={{ opacity: 0, y: 24 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, margin: "-100px" }}
            transition={{ duration: 0.5 }}
            className="mb-12 text-center font-serif text-3xl font-semibold text-beige-700"
          >
            Our Values
          </motion.h2>
          <div className="grid gap-8 md:grid-cols-3">
            {values.map((value, i) => (
              <motion.div
                key={value.title}
                initial={{ opacity: 0, y: 24 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true, margin: "-50px" }}
                transition={{ duration: 0.5, delay: i * 0.15 }}
                className="rounded-card border border-beige-200 bg-white p-8 text-center shadow-card"
              >
                <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-beige-50">
                  {value.icon}
                </div>
                <h3 className="mb-2 font-serif text-xl font-semibold text-beige-700">
                  {value.title}
                </h3>
                <p className="text-sm leading-relaxed text-beige-800">
                  {value.description}
                </p>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* Timeline */}
      <section className="section-padding bg-beige-50">
        <div className="section-container mx-auto">
          <motion.h2
            initial={{ opacity: 0, y: 24 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, margin: "-100px" }}
            transition={{ duration: 0.5 }}
            className="mb-12 text-center font-serif text-3xl font-semibold text-beige-700"
          >
            Our Journey
          </motion.h2>
          <div className="relative">
            {/* Vertical line */}
            <div className="absolute left-1/2 top-0 hidden h-full w-px -translate-x-1/2 bg-beige-200 md:block" />
            <div className="space-y-8 md:space-y-0">
              {timeline.map((item, i) => {
                const isEven = i % 2 === 0;
                return (
                  <motion.div
                    key={item.year}
                    initial={{ opacity: 0, y: 24 }}
                    whileInView={{ opacity: 1, y: 0 }}
                    viewport={{ once: true, margin: "-50px" }}
                    transition={{ duration: 0.5, delay: i * 0.1 }}
                    className="relative py-6 md:grid md:grid-cols-[1fr_16px_1fr] md:items-center md:gap-4"
                  >
                    {/* Desktop: left column */}
                    <div
                      className={`hidden md:block ${
                        isEven ? "text-right pr-6" : ""
                      }`}
                    >
                      {isEven && (
                        <>
                          <span className="font-serif text-2xl font-bold text-beige-400">
                            {item.year}
                          </span>
                          <h3 className="mt-1 font-serif text-lg font-semibold text-beige-700">
                            {item.title}
                          </h3>
                          <p className="mt-2 text-sm leading-relaxed text-beige-800">
                            {item.description}
                          </p>
                        </>
                      )}
                    </div>

                    {/* Center dot */}
                    <div className="hidden md:flex md:justify-center">
                      <div className="relative z-10 h-4 w-4 rounded-full border-2 border-beige-400 bg-beige-50" />
                    </div>

                    {/* Desktop: right column */}
                    <div
                      className={`hidden md:block ${
                        !isEven ? "pl-6" : ""
                      }`}
                    >
                      {!isEven && (
                        <>
                          <span className="font-serif text-2xl font-bold text-beige-400">
                            {item.year}
                          </span>
                          <h3 className="mt-1 font-serif text-lg font-semibold text-beige-700">
                            {item.title}
                          </h3>
                          <p className="mt-2 text-sm leading-relaxed text-beige-800">
                            {item.description}
                          </p>
                        </>
                      )}
                    </div>

                    {/* Mobile: simple stacked layout */}
                    <div className="flex items-start gap-4 md:hidden">
                      <div className="mt-1 flex-shrink-0">
                        <div className="h-4 w-4 rounded-full border-2 border-beige-400 bg-beige-50" />
                      </div>
                      <div>
                        <span className="font-serif text-2xl font-bold text-beige-400">
                          {item.year}
                        </span>
                        <h3 className="mt-1 font-serif text-lg font-semibold text-beige-700">
                          {item.title}
                        </h3>
                        <p className="mt-2 text-sm leading-relaxed text-beige-800">
                          {item.description}
                        </p>
                      </div>
                    </div>
                  </motion.div>
                );
              })}
            </div>
          </div>
        </div>
      </section>

      <BookingCTA />
    </>
  );
}
