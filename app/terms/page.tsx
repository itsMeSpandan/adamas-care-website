import type { Metadata } from "next";
import Link from "next/link";
import { BRAND } from "@/lib/brand";

export const metadata: Metadata = {
  title: `Terms & Conditions | ${BRAND.name}`,
  description: `Terms and Conditions for ${BRAND.name} — booking policies, cancellations, and service terms.`,
};

const lastUpdated = "September 7, 2026";

export default function TermsPage() {
  return (
    <div className="section-padding bg-beige-50">
      <div className="section-container mx-auto max-w-3xl">
        <h1 className="mb-2 text-center font-serif text-4xl font-semibold text-beige-700 md:text-5xl">
          Terms &amp; Conditions
        </h1>
        <p className="mb-12 text-center text-sm text-beige-500">
          Last updated: {lastUpdated}
        </p>

        <div className="prose-beige space-y-8">
          <section>
            <h2 className="font-serif text-2xl font-semibold text-beige-700">
              1. Acceptance of Terms
            </h2>
            <p className="mt-3 leading-relaxed text-beige-600">
              By accessing and using the {BRAND.name} website and services, you
              agree to be bound by these Terms and Conditions. If you do not
              agree to these terms, please do not use our services.
            </p>
          </section>

          <section>
            <h2 className="font-serif text-2xl font-semibold text-beige-700">
              2. Account Registration
            </h2>
            <div className="mt-3 space-y-3 text-beige-600">
              <p className="leading-relaxed">
                To book services, you must create an account with accurate and
                complete information. You are responsible for maintaining the
                confidentiality of your account credentials.
              </p>
              <p className="leading-relaxed">
                You must be at least 18 years old to create an account. You agree
                to notify us immediately of any unauthorized use of your account.
              </p>
            </div>
          </section>

          <section>
            <h2 className="font-serif text-2xl font-semibold text-beige-700">
              3. Booking &amp; Appointments
            </h2>
            <ul className="mt-3 space-y-2 text-beige-600">
              <li className="flex gap-2">
                <span className="mt-1.5 h-1.5 w-1.5 flex-shrink-0 rounded-full bg-beige-400" />
                All bookings are subject to availability
              </li>
              <li className="flex gap-2">
                <span className="mt-1.5 h-1.5 w-1.5 flex-shrink-0 rounded-full bg-beige-400" />
                Prices are displayed in Indian Rupees (₹) and are inclusive of
                applicable taxes
              </li>
              <li className="flex gap-2">
                <span className="mt-1.5 h-1.5 w-1.5 flex-shrink-0 rounded-full bg-beige-400" />
                We reserve the right to assign specialists based on availability
                and gender preferences
              </li>
              <li className="flex gap-2">
                <span className="mt-1.5 h-1.5 w-1.5 flex-shrink-0 rounded-full bg-beige-400" />
                A valid phone number and email are required for booking
                confirmations
              </li>
            </ul>
          </section>

          <section>
            <h2 className="font-serif text-2xl font-semibold text-beige-700">
              4. Cancellation &amp; Refund Policy
            </h2>
            <div className="mt-3 space-y-3 text-beige-600">
              <p className="leading-relaxed">
                <strong className="text-beige-700">Cancellation by Customer:</strong>{" "}
                You may cancel or reschedule your booking up to 24 hours before
                your appointment. Late cancellations (less than 24 hours) may be
                subject to a cancellation fee.
              </p>
              <p className="leading-relaxed">
                <strong className="text-beige-700">Cancellation by {BRAND.name}:</strong>{" "}
                We reserve the right to cancel or reschedule appointments due to
                unforeseen circumstances. In such cases, a full refund or
                rescheduling will be offered.
              </p>
              <p className="leading-relaxed">
                <strong className="text-beige-700">Refunds:</strong>{" "}
                Refunds for completed services are handled on a case-by-case
                basis. Loyalty points earned from cancelled bookings will be
                reversed.
              </p>
            </div>
          </section>

          <section>
            <h2 className="font-serif text-2xl font-semibold text-beige-700">
              5. Loyalty Program
            </h2>
            <ul className="mt-3 space-y-2 text-beige-600">
              <li className="flex gap-2">
                <span className="mt-1.5 h-1.5 w-1.5 flex-shrink-0 rounded-full bg-beige-400" />
                Points are earned on completed bookings at the published rate
              </li>
              <li className="flex gap-2">
                <span className="mt-1.5 h-1.5 w-1.5 flex-shrink-0 rounded-full bg-beige-400" />
                Points are non-transferable and have no cash value
              </li>
              <li className="flex gap-2">
                <span className="mt-1.5 h-1.5 w-1.5 flex-shrink-0 rounded-full bg-beige-400" />
                Points earned from cancelled bookings will be reversed
              </li>
              <li className="flex gap-2">
                <span className="mt-1.5 h-1.5 w-1.5 flex-shrink-0 rounded-full bg-beige-400" />
                {BRAND.name} reserves the right to modify or terminate the
                loyalty program with reasonable notice
              </li>
            </ul>
          </section>

          <section>
            <h2 className="font-serif text-2xl font-semibold text-beige-700">
              6. User Conduct
            </h2>
            <p className="mt-3 leading-relaxed text-beige-600">
              You agree not to misuse our services, attempt unauthorized access,
              use automated systems to interact with our platform, or engage in
              any activity that disrupts our services or other users&apos;
              experience.
            </p>
          </section>

          <section>
            <h2 className="font-serif text-2xl font-semibold text-beige-700">
              7. Intellectual Property
            </h2>
            <p className="mt-3 leading-relaxed text-beige-600">
              All content on this website, including text, images, logos, and
              design elements, is the property of {BRAND.name} and is protected
              by applicable intellectual property laws.
            </p>
          </section>

          <section>
            <h2 className="font-serif text-2xl font-semibold text-beige-700">
              8. Limitation of Liability
            </h2>
            <p className="mt-3 leading-relaxed text-beige-600">
              {BRAND.name} shall not be liable for any indirect, incidental,
              special, or consequential damages arising from your use of our
              services. Our total liability shall not exceed the amount paid for
              the specific service in question.
            </p>
          </section>

          <section>
            <h2 className="font-serif text-2xl font-semibold text-beige-700">
              9. Governing Law
            </h2>
            <p className="mt-3 leading-relaxed text-beige-600">
              These terms are governed by and construed in accordance with the
              laws of India. Any disputes shall be subject to the exclusive
              jurisdiction of the courts in Kolkata, West Bengal.
            </p>
          </section>

          <section>
            <h2 className="font-serif text-2xl font-semibold text-beige-700">
              10. Changes to Terms
            </h2>
            <p className="mt-3 leading-relaxed text-beige-600">
              We reserve the right to modify these Terms and Conditions at any
              time. Changes will be effective upon posting. Continued use of our
              services constitutes acceptance of the updated terms.
            </p>
          </section>

          <section>
            <h2 className="font-serif text-2xl font-semibold text-beige-700">
              11. Contact
            </h2>
            <p className="mt-3 leading-relaxed text-beige-600">
              For questions about these Terms, please contact us at{" "}
              <a
                href={`mailto:${BRAND.email}`}
                className="underline underline-offset-2 transition-colors hover:text-beige-700"
              >
                {BRAND.email}
              </a>
              .
            </p>
          </section>
        </div>

        <div className="mt-12 border-t border-beige-200 pt-8 text-center text-sm text-beige-500">
          <Link
            href="/privacy"
            className="underline underline-offset-2 transition-colors hover:text-beige-700"
          >
            Privacy Policy
          </Link>
          {" · "}
          <Link
            href="/"
            className="underline underline-offset-2 transition-colors hover:text-beige-700"
          >
            Back to Home
          </Link>
        </div>
      </div>
    </div>
  );
}
