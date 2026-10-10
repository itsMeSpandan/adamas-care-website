import type { Metadata } from "next";
import { BRAND } from "@/lib/brand";

export const metadata: Metadata = {
  title: "Notifications",
  description: `Your booking updates and waitlist offers at ${BRAND.name}.`,
};

export default function NotificationsLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
