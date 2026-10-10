"use client";

/**
 * app/account/notifications/page.tsx — the full in-app inbox.
 *
 * Mirrors the waitlist page: client-side fetch of the signed-in user's own
 * notifications. Opening the page marks them read, so the header badge always
 * agrees with what has been seen.
 */

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { motion } from "framer-motion";
import { Bell, CheckCircle, Clock, Info } from "lucide-react";
import { cn } from "@/lib/utils";

interface Notification {
  id: string;
  type: string;
  title: string;
  body: string;
  deepLink: string | null;
  readAt: string | null;
  createdAt: string;
}

function iconFor(type: string) {
  if (type === "WAITLIST_SLOT_OPEN") return Clock;
  if (type === "CANCELLED") return Info;
  return CheckCircle;
}

function formatWhen(iso: string): string {
  const date = new Date(iso);
  const diffMs = Date.now() - date.getTime();
  const minutes = Math.floor(diffMs / 60_000);
  if (minutes < 1) return "just now";
  if (minutes < 60) return `${minutes} minute${minutes === 1 ? "" : "s"} ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours} hour${hours === 1 ? "" : "s"} ago`;
  const days = Math.floor(hours / 24);
  if (days < 7) return `${days} day${days === 1 ? "" : "s"} ago`;
  return date.toLocaleDateString(undefined, {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}

export default function NotificationsPage() {
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);

  const load = useCallback(async () => {
    try {
      const res = await fetch("/api/notifications?limit=100");
      if (res.status === 401) {
        setError(true);
        return;
      }
      if (!res.ok) {
        setError(true);
        return;
      }
      const data = await res.json();
      setNotifications(Array.isArray(data.notifications) ? data.notifications : []);
      setError(false);
    } catch {
      setError(true);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    (async () => {
      await load();
      // Seen means read: clear the badge for everything on screen.
      try {
        await fetch("/api/notifications", {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ all: true }),
        });
      } catch {
        /* cosmetic only */
      }
    })();
  }, [load]);

  return (
    <section className="section-padding bg-beige-50">
      <div className="section-container mx-auto max-w-3xl">
        <div className="mb-8">
          <h1 className="font-serif text-3xl font-semibold text-beige-700 md:text-4xl">
            Notifications
          </h1>
          <p className="mt-2 text-sm text-beige-600">
            Booking updates and waitlist offers, newest first.
          </p>
        </div>

        {loading ? (
          <div className="space-y-3">
            {Array.from({ length: 4 }).map((_, i) => (
              <div key={i} className="h-20 animate-pulse rounded-card bg-beige-200" />
            ))}
          </div>
        ) : error ? (
          <div className="rounded-card border border-beige-200 bg-white p-8 text-center">
            <p className="text-sm text-beige-600">
              Please sign in to see your notifications.
            </p>
            <Link
              href="/"
              className="mt-4 inline-block rounded-full bg-beige-600 px-5 py-2 text-sm font-medium text-white transition-opacity hover:opacity-90"
            >
              Back to home
            </Link>
          </div>
        ) : notifications.length === 0 ? (
          <div className="rounded-card border border-beige-200 bg-white p-10 text-center">
            <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-beige-100">
              <Bell size={20} className="text-beige-500" />
            </div>
            <p className="font-serif text-lg text-beige-700">Nothing here yet</p>
            <p className="mt-1 text-sm text-beige-600">
              We&apos;ll let you know as soon as something changes with your bookings.
            </p>
          </div>
        ) : (
          <div className="space-y-3">
            {notifications.map((n, i) => {
              const Icon = iconFor(n.type);
              const body = (
                <div className="flex gap-4">
                  <div
                    className={cn(
                      "flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-full",
                      n.type === "WAITLIST_SLOT_OPEN"
                        ? "bg-sage-50 text-sage-600"
                        : "bg-beige-100 text-beige-600"
                    )}
                  >
                    <Icon size={18} />
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="font-medium text-beige-700">{n.title}</p>
                    <p className="mt-1 text-sm text-beige-600">{n.body}</p>
                    <p className="mt-1.5 text-xs text-beige-400">{formatWhen(n.createdAt)}</p>
                  </div>
                </div>
              );

              return (
                <motion.div
                  key={n.id}
                  initial={{ opacity: 0, y: 12 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.25, delay: Math.min(i * 0.04, 0.3) }}
                >
                  {n.deepLink ? (
                    <Link
                      href={n.deepLink}
                      className="block rounded-card border border-beige-200 bg-white p-5 shadow-card transition-all hover:border-beige-300 hover:shadow-card-hover"
                    >
                      {body}
                    </Link>
                  ) : (
                    <div className="rounded-card border border-beige-200 bg-white p-5 shadow-card">
                      {body}
                    </div>
                  )}
                </motion.div>
              );
            })}
          </div>
        )}
      </div>
    </section>
  );
}
