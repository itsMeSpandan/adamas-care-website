import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "WhatsApp Logs",
  description: "View WhatsApp API message logs and delivery status",
};

export default function WhatsAppLogsLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <>{children}</>;
}
