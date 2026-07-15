import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Adamas Care API",
  description: "Backend API for Adamas Care salon management mobile app",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}

// Force dynamic rendering for all pages
export const dynamic = "force-dynamic";
