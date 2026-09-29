import type { Metadata, Viewport } from "next";
import { Cormorant_Garamond, Jost } from "next/font/google";
import { AuthProvider } from "@/lib/auth-context";
import { ToastProvider } from "@/components/ui/Toast";

import { BRAND } from "@/lib/brand";
import PillNavWrapper from "@/components/layout/PillNavWrapper";

import Footer from "@/components/layout/Footer";
import CookieConsent from "@/components/ui/CookieConsent";
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
          </ToastProvider>
        </AuthProvider>
      </body>
    </html>
  );
}
