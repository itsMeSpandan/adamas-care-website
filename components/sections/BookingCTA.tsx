"use client";

import Link from "next/link";

export default function BookingCTA() {
  return (
    <section className="bg-sage-500 py-20">
      <div className="section-container mx-auto px-4 text-center md:px-8">
        <h2
          className="mb-4 font-serif text-3xl font-semibold text-white md:text-4xl lg:text-5xl"
        >
          Ready for your moment?
        </h2>
        <p
          className="mb-8 text-lg text-beige-200"
        >
          Book your appointment and let us take care of the rest.
        </p>
        <div>
          <Link
            href="/booking"
            className="inline-flex items-center justify-center rounded-xl bg-white px-8 py-3.5 text-base font-medium text-beige-700 transition-all duration-300 hover:bg-beige-50 hover:shadow-lg focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white focus-visible:ring-offset-2"
          >
            Book an Appointment
          </Link>
        </div>
      </div>
    </section>
  );
}
