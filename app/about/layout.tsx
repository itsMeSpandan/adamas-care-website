import type { Metadata } from "next";
import { BRAND } from "@/lib/brand";

export const metadata: Metadata = {
  title: "About Us",
  description: `Learn about ${BRAND.name}'s story, values, and our journey of artistry and wellness since 2012. Meet the team behind the salon.`,
};

export default function AboutLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
