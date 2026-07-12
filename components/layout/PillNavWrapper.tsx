"use client";

import { usePathname } from "next/navigation";
import PillNav from "@/components/ui/PillNav";
import { useAuth } from "@/lib/auth-context";

type NavItem = { label: string; href: string };

const guestItems: NavItem[] = [
  { label: "Home", href: "/" },
  { label: "Services", href: "/services" },
  { label: "Book", href: "/booking" },
  { label: "Our Team", href: "/team" },
  { label: "About", href: "/about" },
  { label: "Contact", href: "/contact" },
];

const userItems: NavItem[] = [
  { label: "Home", href: "/" },
  { label: "Services", href: "/services" },
  { label: "Book", href: "/booking" },
  { label: "Our Team", href: "/team" },
  { label: "Profile", href: "/profile" },
  { label: "Contact", href: "/contact" },
];

const employeeItems: NavItem[] = [
  { label: "Home", href: "/" },
  { label: "Dashboard", href: "/employee" },
  { label: "Services", href: "/services" },
  { label: "Bookings", href: "/booking" },
  { label: "Profile", href: "/profile" },
];

const adminItems: NavItem[] = [
  { label: "Home", href: "/" },
  { label: "Dashboard", href: "/admin" },
  { label: "Services", href: "/admin/services" },
  { label: "Schedule", href: "/admin/schedule" },
  { label: "Employees", href: "/admin/employees" },
  { label: "Bookings", href: "/admin/bookings" },
];

export default function PillNavWrapper() {
  const pathname = usePathname();
  const { isAdmin, isEmployee, isAuthenticated } = useAuth();

  let items = guestItems;
  if (isAdmin) {
    items = adminItems;
  } else if (isEmployee) {
    items = employeeItems;
  } else if (isAuthenticated) {
    items = userItems;
  }

  return (
    <PillNav
      logo="/logo.svg"
      logoAlt="Adamas Care"
      items={items}
      activeHref={pathname}
      ease="power2.easeOut"
      baseColor="#F5F1EA"
      pillColor="#1F1F1F"
      pillHoverBg="#C9A86A"
      hoveredPillTextColor="#1F1F1F"
      pillTextColor="#F5F1EA"
      initialLoadAnimation
    />
  );
}
