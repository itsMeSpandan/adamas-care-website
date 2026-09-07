"use client";

import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import Link from "next/link";

const COOKIE_KEY = "gracesalon_cookie_consent";

export default function CookieConsent() {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const consent = localStorage.getItem(COOKIE_KEY);
    if (!consent) {
      // Small delay so it doesn't flash on page load
      const timer = setTimeout(() => setVisible(true), 1500);
      return () => clearTimeout(timer);
    }
  }, []);

  const accept = () => {
    localStorage.setItem(COOKIE_KEY, "accepted");
    setVisible(false);
  };

  const decline = () => {
    localStorage.setItem(COOKIE_KEY, "declined");
    setVisible(false);
  };

  return (
    <AnimatePresence>
      {visible && (
        <motion.div
          initial={{ y: 100, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          exit={{ y: 100, opacity: 0 }}
          transition={{ type: "spring", damping: 25, stiffness: 300 }}
          className="fixed bottom-0 left-0 right-0 z-50 p-4 sm:p-6"
        >
          <div className="mx-auto max-w-3xl overflow-hidden rounded-2xl border border-beige-200 bg-white shadow-2xl">
            <div className="flex flex-col gap-4 p-5 sm:flex-row sm:items-center sm:gap-6 sm:p-6">
              {/* Icon */}
              <div className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-full bg-beige-100">
                <svg
                  width="20"
                  height="20"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="1.5"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  className="text-beige-500"
                >
                  <path d="M12 2a10 10 0 1 0 10 10 4 4 0 0 1-5-5 4 4 0 0 1-5-5" />
                  <path d="M8.5 8.5v.01" />
                  <path d="M16 15.5v.01" />
                  <path d="M12 12v.01" />
                  <path d="M11 17v.01" />
                  <path d="M7 14.5v.01" />
                </svg>
              </div>

              {/* Text */}
              <div className="flex-1">
                <p className="text-sm font-medium text-beige-700">
                  We use cookies
                </p>
                <p className="mt-1 text-xs leading-relaxed text-beige-500">
                  We use essential session cookies to keep you signed in and
                  secure your account. We do not use tracking or advertising
                  cookies.
                </p>
                <Link
                  href="/privacy"
                  className="mt-1 inline-block text-xs font-medium underline underline-offset-2 text-beige-600 hover:text-beige-700"
                >
                  Read our Privacy Policy
                </Link>
              </div>

              {/* Buttons */}
              <div className="flex gap-2 sm:flex-col">
                <button
                  onClick={accept}
                  className="rounded-xl bg-beige-600 px-4 py-2 text-xs font-medium text-white transition-colors hover:bg-[#B56A4D]"
                >
                  Accept
                </button>
                <button
                  onClick={decline}
                  className="rounded-xl border border-beige-300 bg-transparent px-4 py-2 text-xs font-medium text-beige-600 transition-colors hover:bg-beige-50"
                >
                  Decline
                </button>
              </div>
            </div>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
