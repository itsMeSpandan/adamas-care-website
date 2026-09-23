import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Audit Logs",
  description: "View system audit logs and track changes.",
};

export default function AdminLogsLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
