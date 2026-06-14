"use client";

import { useState } from "react";
import { motion } from "framer-motion";
import { BRAND } from "@/lib/brand";
import BookingCTA from "@/components/sections/BookingCTA";

const hours = [
  { day: "Monday – Friday", time: "9:00 AM – 7:00 PM" },
  { day: "Saturday", time: "9:00 AM – 6:00 PM" },
  { day: "Sunday", time: "10:00 AM – 5:00 PM" },
];

export default function ContactPage() {
  const [submitted, setSubmitted] = useState(false);

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
                      142 Blossom Lane, Suite 200
                      <br />
                      Serenity Falls, CA 90210
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
                    142 Blossom Lane, Serenity Falls
                  </p>
                </div>
              </div>
            </motion.div>

            {/* Right: contact form */}
            <motion.div
              initial={{ opacity: 0, y: 24 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, delay: 0.2 }}
            >
              <h2 className="mb-6 font-serif text-2xl font-semibold text-beige-700">
                Send a Message
              </h2>

              {submitted ? (
                <div className="rounded-card border border-beige-200 bg-white p-8 text-center shadow-card">
                  <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-beige-100">
                    <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-beige-500">
                      <polyline points="20 6 9 17 4 12" />
                    </svg>
                  </div>
                  <h3 className="font-serif text-xl font-semibold text-beige-700">
                    Message Sent!
                  </h3>
                  <p className="mt-2 text-sm text-beige-600">
                    Thank you for reaching out. We&apos;ll get back to you
                    within 24 hours.
                  </p>
                </div>
              ) : (
                <form
                  onSubmit={(e) => {
                    e.preventDefault();
                    setSubmitted(true);
                  }}
                  className="space-y-5 rounded-card border border-beige-200 bg-white p-6 shadow-card"
                >
                  <div>
                    <label
                      htmlFor="contact-name"
                      className="mb-1 block text-sm font-medium text-beige-700"
                    >
                      Name
                    </label>
                    <input
                      id="contact-name"
                      type="text"
                      required
                      placeholder="Your name"
                      className="w-full rounded-xl border border-beige-300 bg-beige-50 px-4 py-3 text-sm text-beige-800 placeholder:text-beige-400 focus:border-beige-500 focus:bg-white focus:outline-none focus:ring-2 focus:ring-beige-200"
                    />
                  </div>
                  <div>
                    <label
                      htmlFor="contact-email"
                      className="mb-1 block text-sm font-medium text-beige-700"
                    >
                      Email
                    </label>
                    <input
                      id="contact-email"
                      type="email"
                      required
                      placeholder="your@email.com"
                      className="w-full rounded-xl border border-beige-300 bg-beige-50 px-4 py-3 text-sm text-beige-800 placeholder:text-beige-400 focus:border-beige-500 focus:bg-white focus:outline-none focus:ring-2 focus:ring-beige-200"
                    />
                  </div>
                  <div>
                    <label
                      htmlFor="contact-message"
                      className="mb-1 block text-sm font-medium text-beige-700"
                    >
                      Message
                    </label>
                    <textarea
                      id="contact-message"
                      required
                      rows={5}
                      placeholder="How can we help you?"
                      className="w-full resize-none rounded-xl border border-beige-300 bg-beige-50 px-4 py-3 text-sm text-beige-800 placeholder:text-beige-400 focus:border-beige-500 focus:bg-white focus:outline-none focus:ring-2 focus:ring-beige-200"
                    />
                  </div>
                  <button type="submit" className="btn-primary w-full py-3">
                    Send Message
                  </button>
                </form>
              )}
            </motion.div>
          </div>
        </div>
      </section>

      <BookingCTA />
    </>
  );
}
