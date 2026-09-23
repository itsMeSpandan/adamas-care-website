import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Employees",
  description: "Manage your team members, roles, and service assignments.",
};

export default function AdminEmployeesLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
