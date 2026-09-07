"use client";

import { motion } from "framer-motion";
import { BRAND } from "@/lib/brand";
import BookingCTA from "@/components/sections/BookingCTA";
import ContactForm from "@/components/ui/ContactForm";

const hours = [
  { day: "Monday – Friday", time: "9:00 AM – 7:00 PM" },
  { day: "Saturday", time: "9:00 AM – 6:00 PM" },
  { day: "Sunday", time: "10:00 AM – 5:00 PM" },
];

export default function ContactPage() {
  return (
    <>
      <section className="section-padding bg-beige-100">
        <div className="section-container mx-auto">
          <motion.h1
            initial={{ opacity: 0, y: 24 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
            className="mb-4 text-center font-serif text-4xl font-semibold text-beige-700 md:text-5xl"
          >
            Get in Touch
          </motion.h1>
          <p className="mx-auto mb-16 max-w-xl text-center text-beige-800">
            We&apos;d love to hear from you. Reach out with questions,
            feedback, or simply to say hello.
          </p>

          <div className="grid gap-12 lg:grid-cols-2">
            {/* Left: contact info */}
            <motion.div
              initial={{ opacity: 0, y: 24 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, delay: 0.1 }}
            >
              <h2 className="mb-6 font-serif text-2xl font-semibold text-beige-700">
                Contact Information
              </h2>

              <div className="space-y-6">
                <div className="flex items-start gap-4">
                  <div className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-full bg-beige-100">
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" className="text-beige-500">
                      <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z" />
                      <circle cx="12" cy="10" r="3" />
                    </svg>
                  </div>
                  <div>
                    <p className="font-medium text-beige-700">Address</p>
                    <p className="text-sm text-beige-600">
                      {BRAND.address}
                    </p>
                  </div>
                </div>

                <div className="flex items-start gap-4">
                  <div className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-full bg-beige-100">
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" className="text-beige-500">
                      <path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 16.92z" />
                    </svg>
                  </div>
                  <div>
                    <p className="font-medium text-beige-700">Phone</p>
                    <a
                      href="tel:+13105551234"
                      className="text-sm text-beige-600 transition-colors hover:text-beige-700"
                    >
                      (310) 555-1234
                    </a>
                  </div>
                </div>

                <div className="flex items-start gap-4">
                  <div className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-full bg-beige-100">
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" className="text-beige-500">
                      <rect width="20" height="16" x="2" y="4" rx="2" />
                      <path d="m22 7-8.97 5.7a1.94 1.94 0 0 1-2.06 0L2 7" />
                    </svg>
                  </div>
                  <div>
                    <p className="font-medium text-beige-700">Email</p>
                    <a
                      href={`mailto:${BRAND.email}`}
                      className="text-sm text-beige-600 transition-colors hover:text-beige-700"
                    >
                      {BRAND.email}
                    </a>
                  </div>
                </div>
              </div>

              {/* Hours */}
              <div className="mt-8">
                <h3 className="mb-3 font-serif text-lg font-semibold text-beige-700">
                  Business Hours
                </h3>
                <div className="overflow-hidden rounded-card border border-beige-200 bg-white">
                  {hours.map((row, i) => (
                    <div
                      key={row.day}
                      className={`flex justify-between px-4 py-3 text-sm ${
                        i < hours.length - 1 ? "border-b border-beige-100" : ""
                      }`}
                    >
                      <span className="text-beige-600">{row.day}</span>
                      <span className="font-medium text-beige-700">
                        {row.time}
                      </span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Map placeholder */}
              <div className="mt-8 flex h-48 items-center justify-center rounded-card border border-beige-200 bg-beige-100">
                <div className="text-center">
                  <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" className="mx-auto text-beige-400">
                    <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z" />
                    <circle cx="12" cy="10" r="3" />
                  </svg>
                  <p className="mt-2 text-sm font-medium text-beige-600">
                    Find us here
                  </p>
                  <p className="text-xs text-beige-500">
                    {BRAND.address}
                  </p>
                </div>
              </div>
            </motion.div>

            {/* Right: contact form */}
            <motion.div
              initial={{ opacity: 0, y: 24 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, delay: 0.2 }}
            >              <h2 className="mb-6 font-serif text-2xl font-semibold text-beige-700">
                Send a Message
              </h2>

              <ContactForm />
            </motion.div>
          </div>
        </div>
      </section>

      <BookingCTA />
    </>
  );
}
