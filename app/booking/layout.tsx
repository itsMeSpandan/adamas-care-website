import type { Metadata } from "next";
import { BRAND } from "@/lib/brand";

export const metadata: Metadata = {
  title: "Book Appointment",
  description: `Book your next appointment at ${BRAND.name}. Choose from hair, skin, nail, body, and bridal services with our expert specialists.`,
};

export default function BookingLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
