"use client";

/**
 * components/ui/NotificationBell.tsx — the in-app inbox in the header.
 *
 * Renders nothing when signed out. Polls lightly (on focus and every minute)
 * so a freed waitlist slot appears without a page reload, and marks everything
 * read when the inbox is opened.
 */

import { useCallback, useEffect, useRef, useState } from "react";
import Link from "next/link";
import { Bell } from "lucide-react";
import { useAuth } from "@/lib/auth-context";
import { cn } from "@/lib/utils";

interface Notification {
  id: string;
  type: string;
  title: string;
  body: string;
  deepLink: string | null;
  bookingId: string | null;
  readAt: string | null;
  createdAt: string;
}

const PREVIEW_LIMIT = 5;
const POLL_MS = 60_000;

/** "just now" / "12m ago" / "3h ago" / "2d ago" — enough for an inbox. */
function relativeTime(iso: string): string {
  const diffMs = Date.now() - new Date(iso).getTime();
  const minutes = Math.floor(diffMs / 60_000);
  if (minutes < 1) return "just now";
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  return `${Math.floor(hours / 24)}d ago`;
}

export default function NotificationBell() {
  const { isAuthenticated } = useAuth();
  const [open, setOpen] = useState(false);
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const ref = useRef<HTMLDivElement>(null);

  const load = useCallback(async () => {
    try {
      const res = await fetch(`/api/notifications?limit=${PREVIEW_LIMIT}`);
      if (!res.ok) return; // signed out (401) or transient — leave the badge as-is
      const data = await res.json();
      setNotifications(Array.isArray(data.notifications) ? data.notifications : []);
      setUnreadCount(typeof data.unreadCount === "number" ? data.unreadCount : 0);
    } catch {
      /* offline — the next poll tries again */
    }
  }, []);

  useEffect(() => {
    if (!isAuthenticated) {
      setNotifications([]);
      setUnreadCount(0);
      return;
    }
    load();
    const onFocus = () => load();
    const timer = setInterval(load, POLL_MS);
    window.addEventListener("focus", onFocus);
    return () => {
      clearInterval(timer);
      window.removeEventListener("focus", onFocus);
    };
  }, [isAuthenticated, load]);

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const openInbox = () => {
    const next = !open;
    setOpen(next);
    if (!next) return;

    // Opening the inbox is the acknowledgement, so the badge clears. Only the
    // badge is updated optimistically; the list itself is re-read on close.
    if (unreadCount > 0) {
      setUnreadCount(0);
      fetch("/api/notifications", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ all: true }),
      }).catch(() => {
        /* read state is cosmetic — a failure just leaves the badge on next poll */
      });
    }
  };

  if (!isAuthenticated) return null;

  return (
    <div ref={ref} className="relative">
      <button
        onClick={openInbox}
        className="relative rounded-full border border-beige-200 bg-white p-2 text-beige-600 transition-all hover:border-beige-300 hover:text-beige-800"
        aria-label={
          unreadCount > 0
            ? `Notifications, ${unreadCount} unread`
            : "Notifications"
        }
      >
        <Bell size={16} />
        {unreadCount > 0 && (
          <span className="absolute -right-1 -top-1 flex h-4 min-w-[16px] items-center justify-center rounded-full bg-beige-600 px-1 text-[10px] font-semibold text-white">
            {unreadCount > 9 ? "9+" : unreadCount}
          </span>
        )}
      </button>

      {open && (
        <div className="absolute right-0 top-full z-50 mt-2 w-80 overflow-hidden rounded-card border border-beige-200 bg-white shadow-lg">
          <div className="flex items-center justify-between border-b border-beige-100 px-4 py-3">
            <p className="text-sm font-medium text-beige-700">Notifications</p>
            {unreadCount > 0 && (
              <span className="rounded-full bg-beige-100 px-2 py-0.5 text-[10px] font-medium text-beige-600">
                {unreadCount} new
              </span>
            )}
          </div>

          {notifications.length === 0 ? (
            <p className="px-4 py-6 text-center text-sm text-beige-500">
              Nothing yet. We&apos;ll let you know when something changes.
            </p>
          ) : (
            <div className="max-h-80 overflow-y-auto">
              {notifications.map((n) => {
                const content = (
                  <>
                    <p className="text-sm font-medium text-beige-700">{n.title}</p>
                    <p className="mt-0.5 text-xs text-beige-600">{n.body}</p>
                    <p className="mt-1 text-[10px] text-beige-400">
                      {relativeTime(n.createdAt)}
                    </p>
                  </>
                );

                return n.deepLink ? (
                  <Link
                    key={n.id}
                    href={n.deepLink}
                    onClick={() => setOpen(false)}
                    className={cn(
                      "block border-b border-beige-100 px-4 py-3 transition-colors hover:bg-beige-50",
                      !n.readAt && "bg-beige-50/60"
                    )}
                  >
                    {content}
                  </Link>
                ) : (
                  <div key={n.id} className="border-b border-beige-100 px-4 py-3">
                    {content}
                  </div>
                );
              })}
            </div>
          )}

          <Link
            href="/account/notifications"
            onClick={() => setOpen(false)}
            className="block px-4 py-3 text-center text-sm font-medium text-beige-600 transition-colors hover:bg-beige-50"
          >
            View all
          </Link>
        </div>
      )}
    </div>
  );
}
