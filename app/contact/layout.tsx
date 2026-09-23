import type { Metadata } from "next";
import { BRAND } from "@/lib/brand";

export const metadata: Metadata = {
  title: "Contact Us",
  description: `Get in touch with ${BRAND.name}. Visit us at ${BRAND.address}. Call, email, or send us a message.`,
};

export default function ContactLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
