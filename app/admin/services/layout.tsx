import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Services",
  description: "Manage services, pricing, and categories.",
};

export default function AdminServicesLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
