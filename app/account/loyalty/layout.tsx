import type { Metadata } from "next";
import { BRAND } from "@/lib/brand";

export const metadata: Metadata = {
  title: "Loyalty & Rewards",
  description: `Track your loyalty points, view transaction history, and redeem rewards at ${BRAND.name}.`,
};

export default function LoyaltyLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
