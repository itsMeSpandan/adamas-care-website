import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Holidays",
  description: "Manage salon holidays and closures.",
};

export default function AdminHolidaysLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
