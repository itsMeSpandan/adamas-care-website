"use client";

import { motion } from "framer-motion";
import Link from "next/link";

export default function BookingCTA() {
  return (
    <section className="bg-beige-700 py-20">
      <div className="section-container mx-auto px-4 text-center md:px-8">
        <motion.h2
          initial={{ opacity: 0, y: 24 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: "-100px" }}
          transition={{ duration: 0.5 }}
          className="mb-4 font-serif text-3xl font-semibold text-white md:text-4xl lg:text-5xl"
        >
          Ready for your moment?
        </motion.h2>
        <motion.p
          initial={{ opacity: 0, y: 24 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: "-100px" }}
          transition={{ duration: 0.5, delay: 0.1 }}
          className="mb-8 text-lg text-beige-200"
        >
          Book your appointment and let us take care of the rest.
        </motion.p>
        <motion.div
          initial={{ opacity: 0, y: 24 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: "-100px" }}
          transition={{ duration: 0.5, delay: 0.2 }}
        >
          <Link
            href="/booking"
            className="inline-flex items-center justify-center rounded-xl bg-white px-8 py-3.5 text-base font-medium text-beige-700 transition-all duration-300 hover:bg-beige-50 hover:shadow-lg focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white focus-visible:ring-offset-2"
          >
            Book an Appointment
          </Link>
        </motion.div>
      </div>
    </section>
  );
}
