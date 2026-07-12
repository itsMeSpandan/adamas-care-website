"use client";

import { usePathname } from "next/navigation";
import PillNav from "@/components/ui/PillNav";

const navItems = [
  { label: "Home", href: "/" },
  { label: "Products", href: "/services" },
  { label: "Consultation", href: "/booking" },
  { label: "Face Lift", href: "/services" },
  { label: "Reviews", href: "/about" },
  { label: "Certify", href: "/contact" },
];

export default function PillNavWrapper() {
  const pathname = usePathname();

  return (
    <PillNav
      logo="/logo.svg"
      logoAlt="Adamas Care"
      items={navItems}
      activeHref={pathname}
      ease="power2.easeOut"
      baseColor="#F5F1EA"
      pillColor="#1F1F1F"
      hoveredPillTextColor="#F5F1EA"
      pillTextColor="#F5F1EA"
      initialLoadAnimation
    />
  );
}
