import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Loyalty",
  description: "Manage loyalty program settings and view transactions.",
};

export default function AdminLoyaltyLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
