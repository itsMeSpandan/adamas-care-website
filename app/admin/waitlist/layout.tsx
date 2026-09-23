import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Waitlist",
  description: "View and manage customer waitlist entries and rankings.",
};

export default function AdminWaitlistLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
