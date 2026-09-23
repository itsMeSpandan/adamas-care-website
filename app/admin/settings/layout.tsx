import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "System Settings",
  description: "Manage WhatsApp configuration and system settings",
};

export default function AdminSettingsLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <>{children}</>;
}
