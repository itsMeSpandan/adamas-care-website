import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Schedule",
  description: "Manage employee availability, overrides, and weekly schedules.",
};

export default function AdminScheduleLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
