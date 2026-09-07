import type { Metadata } from "next";
import Link from "next/link";
import { BRAND } from "@/lib/brand";

export const metadata: Metadata = {
  title: `Privacy Policy | ${BRAND.name}`,
  description: `Privacy Policy for ${BRAND.name} — how we collect, use, and protect your personal information.`,
};

const lastUpdated = "September 7, 2026";

export default function PrivacyPage() {
  return (
    <div className="section-padding bg-beige-50">
      <div className="section-container mx-auto max-w-3xl">
        <h1 className="mb-2 text-center font-serif text-4xl font-semibold text-beige-700 md:text-5xl">
          Privacy Policy
        </h1>
        <p className="mb-12 text-center text-sm text-beige-500">
          Last updated: {lastUpdated}
        </p>

        <div className="prose-beige space-y-8">
          <section>
            <h2 className="font-serif text-2xl font-semibold text-beige-700">
              1. Introduction
            </h2>
            <p className="mt-3 leading-relaxed text-beige-600">
              Welcome to {BRAND.name}. We are committed to protecting your
              personal information and your right to privacy. This Privacy Policy
              explains how we collect, use, disclose, and safeguard your
              information when you visit our website and use our booking services.
            </p>
          </section>

          <section>
            <h2 className="font-serif text-2xl font-semibold text-beige-700">
              2. Information We Collect
            </h2>
            <div className="mt-3 space-y-3 text-beige-600">
              <p className="leading-relaxed">
                <strong className="text-beige-700">Personal Information:</strong>{" "}
                When you create an account or book a service, we may collect your
                name, email address, phone number, WhatsApp number, gender, and
                payment-related information.
              </p>
              <p className="leading-relaxed">
                <strong className="text-beige-700">Booking Data:</strong>{" "}
                Service selections, appointment dates and times, specialist
                preferences, and any notes you provide.
              </p>
              <p className="leading-relaxed">
                <strong className="text-beige-700">Usage Data:</strong>{" "}
                Automatically collected information including your IP address,
                browser type, device information, pages visited, and time spent
                on our website.
              </p>
              <p className="leading-relaxed">
                <strong className="text-beige-700">Loyalty Data:</strong>{" "}
                Points earned, redeemed, and transaction history within our
                rewards program.
              </p>
            </div>
          </section>

          <section>
            <h2 className="font-serif text-2xl font-semibold text-beige-700">
              3. How We Use Your Information
            </h2>
            <ul className="mt-3 space-y-2 text-beige-600">
              <li className="flex gap-2">
                <span className="mt-1.5 h-1.5 w-1.5 flex-shrink-0 rounded-full bg-beige-400" />
                Process and manage your bookings and appointments
              </li>
              <li className="flex gap-2">
                <span className="mt-1.5 h-1.5 w-1.5 flex-shrink-0 rounded-full bg-beige-400" />
                Send booking confirmations, reminders, and updates
              </li>
              <li className="flex gap-2">
                <span className="mt-1.5 h-1.5 w-1.5 flex-shrink-0 rounded-full bg-beige-400" />
                Manage your loyalty points and rewards
              </li>
              <li className="flex gap-2">
                <span className="mt-1.5 h-1.5 w-1.5 flex-shrink-0 rounded-full bg-beige-400" />
                Match you with specialists based on your preferences and gender
              </li>
              <li className="flex gap-2">
                <span className="mt-1.5 h-1.5 w-1.5 flex-shrink-0 rounded-full bg-beige-400" />
                Improve our website, services, and customer experience
              </li>
              <li className="flex gap-2">
                <span className="mt-1.5 h-1.5 w-1.5 flex-shrink-0 rounded-full bg-beige-400" />
                Communicate with you about promotions, offers, and services
              </li>
              <li className="flex gap-2">
                <span className="mt-1.5 h-1.5 w-1.5 flex-shrink-0 rounded-full bg-beige-400" />
                Ensure security and prevent fraud
              </li>
            </ul>
          </section>

          <section>
            <h2 className="font-serif text-2xl font-semibold text-beige-700">
              4. Cookies
            </h2>
            <p className="mt-3 leading-relaxed text-beige-600">
              We use httpOnly session cookies for authentication and maintaining
              your login session. These cookies are essential for the website to
              function and are not used for tracking or advertising purposes.
              You can control cookie settings through your browser preferences.
            </p>
          </section>

          <section>
            <h2 className="font-serif text-2xl font-semibold text-beige-700">
              5. Data Sharing
            </h2>
            <p className="mt-3 leading-relaxed text-beige-600">
              We do not sell, trade, or rent your personal information to third
              parties. We may share information with:
            </p>
            <ul className="mt-3 space-y-2 text-beige-600">
              <li className="flex gap-2">
                <span className="mt-1.5 h-1.5 w-1.5 flex-shrink-0 rounded-full bg-beige-400" />
                Service providers who assist in operating our website and
                services
              </li>
              <li className="flex gap-2">
                <span className="mt-1.5 h-1.5 w-1.5 flex-shrink-0 rounded-full bg-beige-400" />
                Legal authorities when required by law
              </li>
              <li className="flex gap-2">
                <span className="mt-1.5 h-1.5 w-1.5 flex-shrink-0 rounded-full bg-beige-400" />
                Business transfer scenarios (mergers, acquisitions)
              </li>
            </ul>
          </section>

          <section>
            <h2 className="font-serif text-2xl font-semibold text-beige-700">
              6. Data Security
            </h2>
            <p className="mt-3 leading-relaxed text-beige-600">
              We implement industry-standard security measures including HTTPS
              encryption, httpOnly secure cookies, bcrypt password hashing,
              rate limiting, and content security policies. However, no method of
              transmission over the Internet is 100% secure.
            </p>
          </section>

          <section>
            <h2 className="font-serif text-2xl font-semibold text-beige-700">
              7. Your Rights
            </h2>
            <p className="mt-3 leading-relaxed text-beige-600">
              You have the right to access, correct, or delete your personal
              data. You can update your profile information through your account
              settings, or contact us directly to request data deletion.
            </p>
          </section>

          <section>
            <h2 className="font-serif text-2xl font-semibold text-beige-700">
              8. Data Retention
            </h2>
            <p className="mt-3 leading-relaxed text-beige-600">
              We retain your personal information for as long as your account is
              active or as needed to provide services. Booking records and loyalty
              transaction history may be retained for accounting and legal
              compliance purposes.
            </p>
          </section>

          <section>
            <h2 className="font-serif text-2xl font-semibold text-beige-700">
              9. Children&apos;s Privacy
            </h2>
            <p className="mt-3 leading-relaxed text-beige-600">
              Our services are not intended for individuals under the age of 18.
              We do not knowingly collect personal information from children.
            </p>
          </section>

          <section>
            <h2 className="font-serif text-2xl font-semibold text-beige-700">
              10. Changes to This Policy
            </h2>
            <p className="mt-3 leading-relaxed text-beige-600">
              We may update this Privacy Policy from time to time. Changes will
              be posted on this page with an updated &quot;Last updated&quot;
              date.
            </p>
          </section>

          <section>
            <h2 className="font-serif text-2xl font-semibold text-beige-700">
              11. Contact Us
            </h2>
            <p className="mt-3 leading-relaxed text-beige-600">
              If you have questions about this Privacy Policy, please contact us
              at{" "}
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
            href="/terms"
            className="underline underline-offset-2 transition-colors hover:text-beige-700"
          >
            Terms &amp; Conditions
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
