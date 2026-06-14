"use client";

import { motion } from "framer-motion";
import Image from "next/image";
import Link from "next/link";
import { BRAND } from "@/lib/brand";

export default function HeroSection() {
  return (
    <section className="relative flex min-h-[90vh] items-center bg-beige-50 px-4 py-20 md:px-8 lg:px-16">
      <div className="section-container mx-auto grid items-center gap-12 lg:grid-cols-2">
        {/* Left content */}
        <motion.div
          initial={{ opacity: 0, y: 24 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
          className="max-w-xl"
        >
          <h1 className="font-serif text-5xl font-semibold leading-tight text-beige-700 md:text-6xl lg:text-7xl">
            Luxury you deserve.{" "}
            <span className="text-beige-400">Moments that last.</span>
          </h1>
          <p className="mt-6 text-lg leading-relaxed text-beige-800">
            Experience the art of beauty at {BRAND.name}. Our team of expert
            stylists and therapists deliver bespoke treatments that leave you
            feeling radiant, confident, and renewed.
          </p>
          <div className="mt-8 flex flex-wrap gap-4">
            <Link href="/booking" className="btn-primary px-8 py-3.5 text-base">
              Book Now
            </Link>
            <Link
              href="/services"
              className="btn-outline px-8 py-3.5 text-base"
            >
              View Services
            </Link>
          </div>
        </motion.div>

        {/* Right image collage */}
        <motion.div
          initial={{ opacity: 0, y: 24 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.2 }}
          className="relative hidden h-[560px] lg:block"
        >
          {/* Top image */}
          <div className="absolute right-0 top-0 h-[280px] w-[220px] overflow-hidden rounded-2xl shadow-card">
            <Image
              src="https://images.unsplash.com/photo-1560066984-138dadb4c035?w=600&q=80"
              alt="Salon styling"
              fill
              className="object-cover"
              sizes="(max-width: 1024px) 0px, 220px"
              priority
            />
          </div>
          {/* Middle image */}
          <div className="absolute left-12 top-[100px] h-[260px] w-[200px] overflow-hidden rounded-2xl shadow-card">
            <Image
              src="https://images.unsplash.com/photo-1570172619644-dfd03ed5d881?w=600&q=80"
              alt="Spa treatment"
              fill
              className="object-cover"
              sizes="(max-width: 1024px) 0px, 200px"
              priority
            />
          </div>
          {/* Bottom image */}
          <div className="absolute bottom-0 right-4 h-[240px] w-[260px] overflow-hidden rounded-2xl shadow-card">
            <Image
              src="https://images.unsplash.com/photo-1604654894610-df63bc536371?w=600&q=80"
              alt="Nail art"
              fill
              className="object-cover"
              sizes="(max-width: 1024px) 0px, 260px"
              priority
            />
          </div>
        </motion.div>
      </div>
    </section>
  );
}
