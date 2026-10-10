import type { Metadata } from "next";
import { BRAND } from "@/lib/brand";

export const metadata: Metadata = {
  title: "Book Appointment",
  description: `Book your next appointment at ${BRAND.name}. Choose from deep tissue, Swedish, Thai and mini massages with our expert therapists.`,
};

export default function BookingLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
