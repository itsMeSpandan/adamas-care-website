"use client";

import Link from "next/link";
import Image from "next/image";
import { useAuth } from "@/lib/auth-context";
import NotificationBell from "@/components/ui/NotificationBell";

export default function UserPanel() {
  const { user, isAuthenticated } = useAuth();

  if (!isAuthenticated || !user) return null;

  return (
    <div className="flex items-center gap-2">
      {/* In-app inbox */}
      <NotificationBell />
      <Link
        href="/profile"
        className="flex items-center gap-2 rounded-full border border-beige-200 bg-white p-1 pr-3 transition-all hover:border-beige-300 hover:shadow-sm"
        aria-label="User profile"
      >
        <div className="relative h-7 w-7 overflow-hidden rounded-full">
          <Image
            src={user.avatarUrl}
            alt={user.name}
            fill
            className="object-cover"
            sizes="28px"
          />
        </div>
        <span className="hidden text-sm font-medium text-beige-700 md:inline">
          {user.name.split(" ")[0]}
        </span>
      </Link>
    </div>
  );
}
