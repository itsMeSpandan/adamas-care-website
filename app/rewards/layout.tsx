import type { Metadata } from "next";
import { BRAND } from "@/lib/brand";

export const metadata: Metadata = {
  title: "Rewards",
  description: `Earn and redeem loyalty points at ${BRAND.name}. Browse available rewards and exclusive member benefits.`,
};

export default function RewardsLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
