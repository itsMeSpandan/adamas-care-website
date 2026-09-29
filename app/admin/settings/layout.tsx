import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "System Settings",
  description: "Manage system settings and configuration",
};

export default function AdminSettingsLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <>{children}</>;
}
