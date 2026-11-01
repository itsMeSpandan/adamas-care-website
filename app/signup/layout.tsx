import type { Metadata } from "next";
import { BRAND } from "@/lib/brand";

export const metadata: Metadata = {
  title: "Join Adamas Care",
  description: `Join ${BRAND.name} for personalized treatments and rewards.`,
};

export default function SignupLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
