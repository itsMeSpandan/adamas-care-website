import type { Metadata, Viewport } from "next";
import dynamic from "next/dynamic";
import { Cormorant_Garamond, Jost, Inter } from "next/font/google";
import { AuthProvider } from "@/lib/auth-context";
import { ToastProvider } from "@/components/ui/Toast";

import { BRAND } from "@/lib/brand";
import Navbar from "@/components/layout/Navbar";

import Footer from "@/components/layout/Footer";
import CookieConsent from "@/components/ui/CookieConsent";
import PwaRegistration from "@/components/PwaRegistration";
import "./globals.css";

// Defer non-critical modals and prompt dialogs from the critical render path
const WhatsAppPromptModal = dynamic(
  () => import("@/components/ui/WhatsAppPromptModal"),
  { ssr: false }
);
const GenderPromptModal = dynamic(
  () => import("@/components/ui/GenderPromptModal"),
  { ssr: false }
);
const NotificationPromptModal = dynamic(
  () => import("@/components/ui/NotificationPromptModal"),
  { ssr: false }
);
const InstallBanner = dynamic(
  () => import("@/components/ui/InstallBanner"),
  { ssr: false }
);

const cormorant = Cormorant_Garamond({
  subsets: ["latin"],
  weight: ["300", "400", "500", "600", "700"],
  variable: "--font-cormorant",
  display: "swap",
});

const jost = Jost({
  subsets: ["latin"],
  variable: "--font-jost",
  display: "swap",
});

const inter = Inter({
  subsets: ["latin"],
  variable: "--font-inter",
  display: "swap",
});

export const metadata: Metadata = {
  title: {
    default: BRAND.title,
    template: `%s | ${BRAND.name}`,
  },
  description:
    `${BRAND.name} — massages, body treatments and relaxing spa therapies in Kolkata. Expert therapists, online booking, and a loyalty rewards program.`,
  metadataBase: new URL(BRAND.baseUrl),
  openGraph: {
    title: BRAND.title,
    description: `${BRAND.name} — massages, body treatments and relaxing spa therapies in Kolkata.`,
    url: BRAND.baseUrl,
    siteName: BRAND.name,
    type: "website",
    locale: "en_IN",
    images: [
      {
        url: `${BRAND.baseUrl}/og-image.jpg`,
        width: 1200,
        height: 630,
        alt: `${BRAND.name} | ${BRAND.tagline}`,
        type: "image/jpeg",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: BRAND.title,
    description: `${BRAND.name} — massages, body treatments and relaxing spa therapies in Kolkata.`,
    images: [`${BRAND.baseUrl}/og-image.jpg`],
  },
  // ─── PWA ───
  // app/manifest.ts is linked automatically; these cover iOS Safari,
  // which ignores the manifest and needs its own meta tags.
  appleWebApp: {
    capable: true,
    title: BRAND.name,
    statusBarStyle: "default",
  },
  icons: {
    icon: [
      { url: "/icons/icon-192.png", sizes: "192x192", type: "image/png" },
      { url: "/icons/icon-512.png", sizes: "512x512", type: "image/png" },
    ],
    apple: "/icons/apple-touch-icon.png",
  },
};

export const viewport: Viewport = {
  themeColor: "#F5F1EA",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className={`${cormorant.variable} ${inter.variable} ${jost.variable}`}>
      <body className="min-h-screen font-sans antialiased">
        <a
          href="#main-content"
          className="sr-only focus:not-sr-only focus:fixed focus:top-4 focus:left-4 focus:z-50 focus:rounded-md focus:bg-[#2B2420] focus:px-4 focus:py-2 focus:text-white focus:shadow-lg focus:outline-none focus:ring-2 focus:ring-[#C97B5C]"
        >
          Skip to content
        </a>
        <AuthProvider>
          <PwaRegistration />
          <ToastProvider>
            <Navbar />
            <main id="main-content">{children}</main>
            <Footer />
            <CookieConsent />
            {/* Raised by lib/auth-context after a Google sign-in when the
                account has no contact number yet. No-ops otherwise. */}
            <WhatsAppPromptModal />
            {/* Profile gate: returns every visit until the account stores a
                gender (session-scoped dismiss — see GenderPromptModal). */}
            <GenderPromptModal />
            {/* Start-of-visit soft-ask: returns every session until
                notifications are actually enabled (session-scoped dismiss). */}
            <NotificationPromptModal />
            {/* Install CTA on browsers that can install a web app, floated at
                the bottom centre for 2 minutes (see InstallBanner). Hidden
                until the cookie bar is answered. */}
            <div className="pointer-events-none fixed inset-x-0 bottom-4 z-[60] flex justify-center px-4 sm:bottom-6">
              <div className="pointer-events-auto w-full max-w-sm">
                <InstallBanner />
              </div>
            </div>
          </ToastProvider>
        </AuthProvider>
      </body>
    </html>
  );
}
