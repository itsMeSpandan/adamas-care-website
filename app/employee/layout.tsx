"use client";

import RoleLayout from "@/components/layout/RoleLayout";
import type { NavLink } from "@/components/layout/RoleLayout";
import MustChangePasswordModal from "@/components/ui/MustChangePasswordModal";
import { useAuth } from "@/lib/auth-context";

const employeeLinks: NavLink[] = [
  {
    href: "/employee",
    label: "Dashboard",
    icon: (
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
        <rect x="3" y="3" width="7" height="7" /><rect x="14" y="3" width="7" height="7" /><rect x="14" y="14" width="7" height="7" /><rect x="3" y="14" width="7" height="7" />
      </svg>
    ),
  },
];

export default function EmployeeLayout({ children }: { children: React.ReactNode }) {
  const { user } = useAuth();

  const showPasswordModal = user?.mustChangePassword === true;

  return (
    <>
      <MustChangePasswordModal
        open={showPasswordModal}
        onComplete={() => {}}
      />
      <RoleLayout
        role="employee"
        portalLabel="Employee Portal"
        roleLabel="Employee"
        links={employeeLinks}
      >
        {children}
      </RoleLayout>
    </>
  );
}
