import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Bookings",
  description: "View and manage all customer bookings.",
};

export default function AdminBookingsLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
