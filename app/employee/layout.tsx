"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import Image from "next/image";
import { usePathname, useRouter } from "next/navigation";
import { useAuth } from "@/lib/auth-context";
import { cn } from "@/lib/utils";

const employeeLinks = [
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
  const { user, isEmployee, isAuthenticated } = useAuth();
  const pathname = usePathname();
  const router = useRouter();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [authorized, setAuthorized] = useState(false);

  useEffect(() => {
    if (!isAuthenticated || !isEmployee) {
      router.replace("/");
    } else {
      setAuthorized(true);
    }
  }, [isAuthenticated, isEmployee, router]);

  if (!authorized) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center">
        <div className="flex flex-col items-center gap-4">
          <div className="h-8 w-8 animate-spin rounded-full border-2 border-beige-300 border-t-beige-600" />
          <p className="text-sm text-beige-500">Verifying access...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex min-h-[calc(100vh-4rem)]">
      <aside
        className={cn(
          "fixed inset-y-0 left-0 z-30 w-64 border-r border-beige-200 bg-white pt-20 transition-transform duration-300 md:static md:translate-x-0 md:pt-0",
          sidebarOpen ? "translate-x-0" : "-translate-x-full"
        )}
      >
        <div className="px-4 pb-4">
          <p className="text-xs font-medium uppercase tracking-wider text-beige-400">
            Employee Portal
          </p>
          <div className="mt-3 flex items-center gap-3 rounded-lg bg-beige-50 p-3">
            {user && (
              <>
                <div className="relative h-9 w-9 overflow-hidden rounded-full">
                  <Image src={user.avatarUrl} alt={user.name} fill className="object-cover" sizes="36px" />
                </div>
                <div>
                  <p className="text-sm font-medium text-beige-700">{user.name}</p>
                  <p className="text-xs text-beige-500">Employee</p>
                </div>
              </>
            )}
          </div>
        </div>

        <nav className="space-y-1 px-3">
          {employeeLinks.map((link) => {
            const isActive = pathname === link.href;
            return (
              <Link
                key={link.href}
                href={link.href}
                onClick={() => setSidebarOpen(false)}
                className={cn(
                  "flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-all",
                  isActive
                    ? "bg-beige-600 text-white"
                    : "text-beige-600 hover:bg-beige-50 hover:text-beige-700"
                )}
              >
                {link.icon}
                {link.label}
              </Link>
            );
          })}
        </nav>

        <div className="absolute bottom-4 left-0 right-0 px-3">
          <Link
            href="/"
            className="flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium text-beige-500 transition-colors hover:bg-beige-50 hover:text-beige-700"
          >
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
              <path d="m3 9 9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z" /><polyline points="9 22 9 12 15 12 15 22" />
            </svg>
            Back to Site
          </Link>
        </div>
      </aside>

      {sidebarOpen && (
        <div
          className="fixed inset-0 z-20 bg-black/30 md:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      <div className="flex-1 overflow-auto">
        <div className="flex items-center gap-3 border-b border-beige-200 bg-white px-4 py-3 md:hidden">
          <button
            onClick={() => setSidebarOpen(!sidebarOpen)}
            className="text-beige-600"
            aria-label="Toggle sidebar"
          >
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <line x1="3" x2="21" y1="12" y2="12" /><line x1="3" x2="21" y1="6" y2="6" /><line x1="3" x2="21" y1="18" y2="18" />
            </svg>
          </button>
          <span className="text-sm font-medium text-beige-700">Employee Portal</span>
        </div>

        <div className="p-6 md:p-8">{children}</div>
      </div>
    </div>
  );
}
