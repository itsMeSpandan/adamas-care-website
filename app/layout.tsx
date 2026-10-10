import type { Metadata, Viewport } from "next";
import { Cormorant_Garamond, Jost } from "next/font/google";
import { AuthProvider } from "@/lib/auth-context";
import { ToastProvider } from "@/components/ui/Toast";

import { BRAND } from "@/lib/brand";
import PillNavWrapper from "@/components/layout/PillNavWrapper";

import Footer from "@/components/layout/Footer";
import CookieConsent from "@/components/ui/CookieConsent";
import WhatsAppPromptModal from "@/components/ui/WhatsAppPromptModal";
import GenderPromptModal from "@/components/ui/GenderPromptModal";
import NotificationPromptModal from "@/components/ui/NotificationPromptModal";
import InstallBanner from "@/components/ui/InstallBanner";
import "./globals.css";

const cormorant = Cormorant_Garamond({
  subsets: ["latin"],
  weight: ["300", "400", "500", "600", "700"],
  variable: "--font-cormorant",
  display: "swap",
});

const jost = Jost({
  subsets: ["latin"],
  weight: ["300", "400", "500", "600"],
  variable: "--font-jost",
  display: "swap",
});

export const metadata: Metadata = {
  title: {
    default: BRAND.title,
    template: `%s | ${BRAND.name}`,
  },
  description:
    `${BRAND.name} — premium hair, skin, nail, body, and bridal services in Kolkata. Expert specialists, online booking, and a loyalty rewards program.`,
  metadataBase: new URL(BRAND.baseUrl),
  openGraph: {
    title: BRAND.title,
    description: `${BRAND.name} — premium hair, skin, nail, body, and bridal services in Kolkata.`,
    siteName: BRAND.name,
    type: "website",
    locale: "en_IN",
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
    <html lang="en" className={`${cormorant.variable} ${jost.variable}`}>
      <body className="min-h-screen font-sans antialiased">
        <AuthProvider>
          <ToastProvider>
            <PillNavWrapper />
            <main className="pt-24">{children}</main>
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
