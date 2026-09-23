"use client";

import { useState, useEffect, useCallback, Suspense } from "react";
import { motion, AnimatePresence } from "framer-motion";
import Link from "next/link";
import {
  Clock,
  AlertTriangle,
  CheckCircle,
  Timer,
  ArrowRight,
  ShieldCheck,
  ShieldAlert,
  Info,
} from "lucide-react";

/* ---------- types ---------- */

interface WaitlistEntry {
  id: string;
  employee: { id: string; name: string; imageUrl: string };
  slotStart: string;
  slotEnd: string;
  serviceId: string | null;
  status: "waiting" | "notified" | "claimed" | "expired";
  createdAt: string;
  notifiedAt: string | null;
  claimExpiresAt: string | null;
}

interface ReliabilityData {
  summary: string;
  cancelCount: number;
  lateCancelCount: number;
  noShowCount: number;
  restrictedUntil: string | null;
}

/* ---------- helpers ---------- */

function formatTime(time: string): string {
  const [h, m] = time.split(":").map(Number);
  const ampm = h >= 12 ? "PM" : "AM";
  const hour = h % 12 || 12;
  return `${hour}:${m.toString().padStart(2, "0")} ${ampm}`;
}

function getTimeRemaining(expiresAt: string): string {
  const now = Date.now();
  const end = new Date(expiresAt).getTime();
  const diff = end - now;
  if (diff <= 0) return "Expired";
  const minutes = Math.floor(diff / 60000);
  const seconds = Math.floor((diff % 60000) / 1000);
  return `${minutes}m ${seconds}s`;
}

const statusConfig: Record<
  string,
  { label: string; color: string; bgColor: string; icon: React.ReactNode }
> = {
  waiting: {
    label: "Waiting",
    color: "text-amber-600",
    bgColor: "bg-amber-50",
    icon: <Clock className="h-4 w-4" />,
  },
  notified: {
    label: "Slot Available!",
    color: "text-emerald-600",
    bgColor: "bg-emerald-50",
    icon: <CheckCircle className="h-4 w-4" />,
  },
  claimed: {
    label: "Claimed",
    color: "text-blue-600",
    bgColor: "bg-blue-50",
    icon: <CheckCircle className="h-4 w-4" />,
  },
  expired: {
    label: "Expired",
    color: "text-beige-400",
    bgColor: "bg-beige-50",
    icon: <AlertTriangle className="h-4 w-4" />,
  },
};

/* ---------- animation variants ---------- */

const fadeUp = {
  hidden: { opacity: 0, y: 16 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.5 } },
};

/* ================================================================
   Waitlist Dashboard Page
   ================================================================ */

function WaitlistContent() {
  const [entries, setEntries] = useState<WaitlistEntry[]>([]);
  const [reliability, setReliability] = useState<ReliabilityData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const [showHistory, setShowHistory] = useState(false);
  const [, setTick] = useState(0);
  const [claimingId, setClaimingId] = useState<string | null>(null);

  // Tick every second for countdown timers
  useEffect(() => {
    const interval = setInterval(() => setTick((t) => t + 1), 1000);
    return () => clearInterval(interval);
  }, []);

  const fetchData = useCallback(async () => {
    try {
      setLoading(true);
      setError(false);
      const res = await fetch("/api/waitlist/me");
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data = await res.json();
      setEntries(data.entries ?? []);
      setReliability(data.reliability ?? null);
    } catch {
      setError(true);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const handleClaim = async (entryId: string) => {
    setClaimingId(entryId);
    try {
      const res = await fetch(`/api/waitlist/${entryId}/claim`, {
        method: "POST",
      });
      if (res.ok) {
        fetchData();
      }
    } catch {
      // Silent fail — will retry on next fetch
    } finally {
      setClaimingId(null);
    }
  };

  const activeEntries = entries.filter((e) => e.status === "waiting" || e.status === "notified");
  const historyEntries = entries.filter((e) => e.status === "claimed" || e.status === "expired");

  const isRestricted = reliability?.restrictedUntil
    ? new Date(reliability.restrictedUntil) > new Date()
    : false;

  return (
    <div className="section-padding bg-beige-50">
      <div className="section-container mx-auto max-w-5xl">
        <h1 className="mb-8 font-serif text-3xl font-semibold text-beige-700 md:text-4xl">
          My Waitlist
        </h1>

        {/* Reliability Summary */}
        {reliability && (
          <motion.div
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
            className={`mb-8 overflow-hidden rounded-card border bg-white shadow-card ${
              isRestricted ? "border-red-200" : "border-beige-200"
            }`}
          >
            <div
              className={`flex items-start gap-4 px-6 py-5 ${
                isRestricted
                  ? "bg-gradient-to-r from-red-50 to-red-100/50"
                  : "bg-gradient-to-r from-beige-50 to-beige-100/50"
              }`}
            >
              <div
                className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-full ${
                  isRestricted ? "bg-red-100 text-red-600" : "bg-emerald-100 text-emerald-600"
                }`}
              >
                {isRestricted ? (
                  <ShieldAlert className="h-5 w-5" />
                ) : (
                  <ShieldCheck className="h-5 w-5" />
                )}
              </div>
              <div>
                <h3 className="font-serif text-lg font-semibold text-beige-700">
                  Your Reliability
                </h3>
                <p className="mt-1 text-sm text-beige-600">{reliability.summary}</p>
                {isRestricted && reliability.restrictedUntil && (
                  <p className="mt-1 text-xs text-red-500">
                    Restricted until{" "}
                    {new Date(reliability.restrictedUntil).toLocaleDateString("en-US", {
                      month: "long",
                      day: "numeric",
                      year: "numeric",
                    })}
                  </p>
                )}
              </div>
            </div>
          </motion.div>
        )}

        {/* Content */}
        {loading ? (
          <div className="flex items-center justify-center py-12">
            <div className="h-8 w-8 animate-spin rounded-full border-2 border-beige-300 border-t-beige-600" />
          </div>
        ) : error ? (
          <div className="rounded-card border border-red-200 bg-red-50 p-12 text-center shadow-card">
            <h3 className="font-serif text-lg font-semibold text-red-700">
              Couldn&apos;t load waitlist
            </h3>
            <p className="mt-2 text-sm text-red-500">
              There was a problem loading your waitlist. Please try again.
            </p>
            <button
              onClick={fetchData}
              className="btn-primary mt-4 inline-flex gap-2 bg-red-600 hover:bg-red-700"
            >
              Retry
            </button>
          </div>
        ) : entries.length === 0 ? (
          <div className="rounded-card border border-beige-200 bg-white p-12 text-center shadow-card">
            <Clock className="mx-auto h-12 w-12 text-beige-300" />
            <h3 className="mt-4 font-serif text-lg font-semibold text-beige-700">
              No waitlist entries
            </h3>
            <p className="mt-2 text-sm text-beige-500">
              When a slot is full, you can join the waitlist and we&apos;ll notify you when
              it opens up.
            </p>
            <Link
              href="/booking"
              className="btn-primary mt-4 inline-flex gap-2"
            >
              Browse Services
              <ArrowRight className="h-4 w-4" />
            </Link>
          </div>
        ) : (
          <>
            {/* Active Entries */}
            {activeEntries.length > 0 && (
              <div className="mb-8">
                <h2 className="mb-4 font-serif text-xl font-semibold text-beige-700">
                  Active
                </h2>
                <div className="space-y-3">
                  <AnimatePresence>
                    {activeEntries.map((entry) => {
                      const config = statusConfig[entry.status];
                      const canClaim =
                        entry.status === "notified" &&
                        entry.claimExpiresAt &&
                        new Date(entry.claimExpiresAt) > new Date();
                      return (
                        <motion.div
                          key={entry.id}
                          variants={fadeUp}
                          initial="hidden"
                          animate="visible"
                          className="flex flex-col gap-3 rounded-card border border-beige-200 bg-white p-5 shadow-card transition-all hover:-translate-y-0.5 hover:shadow-card-hover sm:flex-row sm:items-center sm:justify-between"
                        >
                          <div className="flex items-center gap-4">
                            <img
                              src={entry.employee.imageUrl}
                              alt={entry.employee.name}
                              className="h-12 w-12 rounded-full object-cover"
                            />
                            <div>
                              <p className="font-medium text-beige-700">
                                {entry.employee.name}
                              </p>
                              <p className="text-sm text-beige-500">
                                {formatTime(entry.slotStart)} – {formatTime(entry.slotEnd)}
                              </p>
                            </div>
                          </div>
                          <div className="flex items-center gap-3">
                            <span
                              className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-medium ${config.bgColor} ${config.color}`}
                            >
                              {config.icon}
                              {config.label}
                            </span>
                            {canClaim && (
                              <>
                                <span className="flex items-center gap-1 text-xs font-medium text-amber-600">
                                  <Timer className="h-3.5 w-3.5" />
                                  {getTimeRemaining(entry.claimExpiresAt!)}
                                </span>
                                <button
                                  onClick={() => handleClaim(entry.id)}
                                  disabled={claimingId === entry.id}
                                  className="btn-primary rounded-full px-4 py-1.5 text-xs"
                                >
                                  {claimingId === entry.id ? "Claiming..." : "Claim Now"}
                                </button>
                              </>
                            )}
                          </div>
                        </motion.div>
                      );
                    })}
                  </AnimatePresence>
                </div>
              </div>
            )}

            {/* History */}
            {historyEntries.length > 0 && (
              <div>
                <button
                  onClick={() => setShowHistory(!showHistory)}
                  className="mb-4 flex items-center gap-2 font-serif text-xl font-semibold text-beige-700"
                >
                  <Info className="h-5 w-5 text-beige-400" />
                  History
                  <span className="text-sm font-normal text-beige-400">
                    ({historyEntries.length})
                  </span>
                </button>
                <AnimatePresence>
                  {showHistory && (
                    <motion.div
                      initial={{ opacity: 0, height: 0 }}
                      animate={{ opacity: 1, height: "auto" }}
                      exit={{ opacity: 0, height: 0 }}
                      className="space-y-3 overflow-hidden"
                    >
                      {historyEntries.map((entry) => {
                        const config = statusConfig[entry.status];
                        return (
                          <div
                            key={entry.id}
                            className="flex items-center justify-between rounded-card border border-beige-200 bg-white p-4 opacity-70 shadow-card"
                          >
                            <div className="flex items-center gap-4">
                              <img
                                src={entry.employee.imageUrl}
                                alt={entry.employee.name}
                                className="h-10 w-10 rounded-full object-cover grayscale"
                              />
                              <div>
                                <p className="text-sm font-medium text-beige-600">
                                  {entry.employee.name}
                                </p>
                                <p className="text-xs text-beige-400">
                                  {formatTime(entry.slotStart)} – {formatTime(entry.slotEnd)}
                                </p>
                              </div>
                            </div>
                            <span
                              className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-medium ${config.bgColor} ${config.color}`}
                            >
                              {config.icon}
                              {config.label}
                            </span>
                          </div>
                        );
                      })}
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}

export default function WaitlistPage() {
  return (
    <Suspense
      fallback={
        <div className="section-padding bg-beige-50">
          <div className="section-container mx-auto max-w-5xl">
            <div className="flex items-center justify-center py-12">
              <div className="h-8 w-8 animate-spin rounded-full border-2 border-beige-300 border-t-beige-600" />
            </div>
          </div>
        </div>
      }
    >
      <WaitlistContent />
    </Suspense>
  );
}
