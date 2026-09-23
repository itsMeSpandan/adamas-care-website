"use client";

import { useState, useEffect, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Clock,
  Users,
  ChevronDown,
  AlertTriangle,
  CheckCircle,
  Timer,
  RefreshCw,
  Star,
  Shield,
} from "lucide-react";

/* ---------- types ---------- */

interface RankedEntry {
  waitlistId: string;
  userId: string;
  score: number;
}

interface WaitlistRow {
  id: string;
  userId: string;
  employeeId: string;
  employeeName: string;
  slotStart: string;
  slotEnd: string;
  status: string;
  createdAt: string;
  notifiedAt: string | null;
  claimExpiresAt: string | null;
  serviceId: string | null;
  score?: number;
}

interface ReliabilityInfo {
  cancelCount: number;
  lateCancelCount: number;
  noShowCount: number;
  restrictedUntil: string | null;
}

interface Employee {
  id: string;
  name: string;
  gender: string | null;
}

/* ---------- helpers ---------- */

function formatTime(time: string): string {
  const [h, m] = time.split(":").map(Number);
  const ampm = h >= 12 ? "PM" : "AM";
  const hour = h % 12 || 12;
  return `${hour}:${m.toString().padStart(2, "0")} ${ampm}`;
}

function formatDate(d: string): string {
  return new Date(d).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

const statusConfig: Record<
  string,
  { label: string; color: string; bgColor: string }
> = {
  waiting: {
    label: "Waiting",
    color: "text-amber-600",
    bgColor: "bg-amber-50",
  },
  notified: {
    label: "Notified",
    color: "text-emerald-600",
    bgColor: "bg-emerald-50",
  },
  claimed: {
    label: "Claimed",
    color: "text-blue-600",
    bgColor: "bg-blue-50",
  },
  expired: {
    label: "Expired",
    color: "text-beige-400",
    bgColor: "bg-beige-100",
  },
};

function getReliabilityBadge(r: ReliabilityInfo | null): {
  label: string;
  color: string;
} {
  if (!r) return { label: "New user", color: "text-emerald-600" };
  const total = r.cancelCount + r.lateCancelCount + r.noShowCount;
  if (r.noShowCount >= 3)
    return { label: "Restricted", color: "text-red-600" };
  if (total >= 3) return { label: "Caution", color: "text-amber-600" };
  if (total >= 1) return { label: "Minor issues", color: "text-amber-500" };
  return { label: "Clean record", color: "text-emerald-600" };
}

/* ================================================================
   Admin Waitlist Dashboard
   ================================================================ */

export default function AdminWaitlistPage() {
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [selectedEmployee, setSelectedEmployee] = useState("");
  const [entries, setEntries] = useState<WaitlistRow[]>([]);
  const [ranked, setRanked] = useState<RankedEntry[]>([]);
  const [reliabilityMap, setReliabilityMap] = useState<
    Record<string, ReliabilityInfo>
  >({});
  const [loading, setLoading] = useState(false);
  const [filter, setFilter] = useState<string>("all");

  // Fetch employees
  useEffect(() => {
    fetch("/api/employees")
      .then((r) => r.json())
      .then((d) => setEmployees(Array.isArray(d) ? d : d.employees ?? []))
      .catch(() => {});
  }, []);

  // Fetch waitlist entries for selected employee
  const fetchEntries = useCallback(async () => {
    if (!selectedEmployee) return;
    setLoading(true);
    try {
      const res = await fetch(
        `/api/admin/waitlist?employeeId=${selectedEmployee}`
      );
      if (res.ok) {
        const data = await res.json();
        setEntries(data.entries ?? []);
        setRanked(data.ranked ?? []);
        setReliabilityMap(data.reliabilityMap ?? {});
      }
    } catch {
      // fallback: try the regular waitlist endpoint
    } finally {
      setLoading(false);
    }
  }, [selectedEmployee]);

  useEffect(() => {
    fetchEntries();
  }, [fetchEntries]);

  const filteredEntries =
    filter === "all"
      ? entries
      : entries.filter((e) => e.status === filter);

  const statusCounts = entries.reduce(
    (acc, e) => {
      acc[e.status] = (acc[e.status] || 0) + 1;
      return acc;
    },
    {} as Record<string, number>
  );

  return (
    <div className="p-6">
      <div className="mb-8">
        <h1 className="font-serif text-3xl font-semibold text-beige-700">
          Waitlist Management
        </h1>
        <p className="mt-2 text-sm text-beige-500">
          View ranked waitlist entries per specialist. Users are scored by wait
          time and reliability.
        </p>
      </div>

      {/* Employee selector */}
      <div className="mb-6 flex flex-wrap items-center gap-4">
        <div className="relative">
          <select
            value={selectedEmployee}
            onChange={(e) => setSelectedEmployee(e.target.value)}
            className="appearance-none rounded-xl border border-beige-300 bg-white px-4 py-3 pr-10 text-sm text-beige-700 focus:border-beige-500 focus:outline-none focus:ring-2 focus:ring-beige-200"
          >
            <option value="">Select specialist</option>
            {employees.map((emp) => (
              <option key={emp.id} value={emp.id}>
                {emp.name}
              </option>
            ))}
          </select>
          <ChevronDown className="pointer-events-none absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-beige-400" />
        </div>

        <button
          onClick={fetchEntries}
          disabled={!selectedEmployee || loading}
          className="inline-flex items-center gap-2 rounded-xl border border-beige-300 bg-white px-4 py-3 text-sm font-medium text-beige-700 transition-colors hover:bg-beige-50 disabled:opacity-40"
        >
          <RefreshCw
            className={`h-4 w-4 ${loading ? "animate-spin" : ""}`}
          />
          Refresh
        </button>
      </div>

      {/* Status filter chips */}
      {entries.length > 0 && (
        <div className="mb-6 flex flex-wrap gap-2">
          <button
            onClick={() => setFilter("all")}
            className={`rounded-full px-4 py-2 text-sm font-medium transition-colors ${
              filter === "all"
                ? "bg-beige-700 text-white"
                : "border border-beige-300 bg-white text-beige-600 hover:bg-beige-50"
            }`}
          >
            All ({entries.length})
          </button>
          {(["waiting", "notified", "claimed", "expired"] as const).map(
            (status) =>
              (statusCounts[status] ?? 0) > 0 && (
                <button
                  key={status}
                  onClick={() => setFilter(status)}
                  className={`rounded-full px-4 py-2 text-sm font-medium transition-colors ${
                    filter === status
                      ? "bg-beige-700 text-white"
                      : "border border-beige-300 bg-white text-beige-600 hover:bg-beige-50"
                  }`}
                >
                  {statusConfig[status].label} ({statusCounts[status]})
                </button>
              )
          )}
        </div>
      )}

      {/* Content */}
      {!selectedEmployee ? (
        <div className="rounded-card border border-beige-200 bg-white p-12 text-center shadow-card">
          <Users className="mx-auto h-12 w-12 text-beige-300" />
          <h3 className="mt-4 font-serif text-lg font-semibold text-beige-700">
            Select a specialist
          </h3>
          <p className="mt-2 text-sm text-beige-500">
            Choose a specialist above to view their waitlist queue, ranked by
            score.
          </p>
        </div>
      ) : loading ? (
        <div className="flex items-center justify-center py-12">
          <div className="h-8 w-8 animate-spin rounded-full border-2 border-beige-300 border-t-beige-600" />
        </div>
      ) : filteredEntries.length === 0 ? (
        <div className="rounded-card border border-beige-200 bg-white p-12 text-center shadow-card">
          <Clock className="mx-auto h-12 w-12 text-beige-300" />
          <h3 className="mt-4 font-serif text-lg font-semibold text-beige-700">
            No waitlist entries
          </h3>
          <p className="mt-2 text-sm text-beige-500">
            No one is currently on the waitlist for this specialist.
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          <AnimatePresence>
            {filteredEntries.map((entry, idx) => {
              const config =
                statusConfig[entry.status] ?? statusConfig.waiting;
              const rel = reliabilityMap[entry.userId];
              const relBadge = getReliabilityBadge(rel);
              // Find rank position
              const rankPos =
                ranked.findIndex((r) => r.waitlistId === entry.id) + 1;
              const score = ranked.find(
                (r) => r.waitlistId === entry.id
              )?.score;

              return (
                <motion.div
                  key={entry.id}
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: idx * 0.03 }}
                  className="flex flex-col gap-3 rounded-card border border-beige-200 bg-white p-5 shadow-card sm:flex-row sm:items-center sm:justify-between"
                >
                  <div className="flex items-center gap-4">
                    {/* Rank badge */}
                    {rankPos > 0 && (
                      <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-sage-50 text-sm font-bold text-sage-500">
                        #{rankPos}
                      </div>
                    )}

                    <div>
                      <div className="flex items-center gap-2">
                        <p className="font-medium text-beige-700">
                          User {entry.userId.slice(0, 8)}…
                        </p>
                        <span
                          className={`inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-xs font-medium ${config.bgColor} ${config.color}`}
                        >
                          {config.label}
                        </span>
                      </div>
                      <p className="mt-0.5 text-sm text-beige-500">
                        {formatTime(entry.slotStart)} –{" "}
                        {formatTime(entry.slotEnd)}
                        <span className="mx-2 text-beige-300">·</span>
                        Joined {formatDate(entry.createdAt)}
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center gap-4">
                    {/* Score */}
                    {score !== undefined && (
                      <div className="flex items-center gap-1.5 rounded-full bg-beige-50 px-3 py-1.5">
                        <Star className="h-3.5 w-3.5 text-amber-500" />
                        <span className="text-sm font-semibold text-beige-700">
                          {score.toFixed(3)}
                        </span>
                      </div>
                    )}

                    {/* Reliability badge */}
                    <div className="flex items-center gap-1.5">
                      <Shield className={`h-3.5 w-3.5 ${relBadge.color}`} />
                      <span
                        className={`text-xs font-medium ${relBadge.color}`}
                      >
                        {relBadge.label}
                      </span>
                    </div>

                    {/* Claim countdown */}
                    {entry.status === "notified" &&
                      entry.claimExpiresAt &&
                      new Date(entry.claimExpiresAt) > new Date() && (
                        <div className="flex items-center gap-1 text-xs font-medium text-amber-600">
                          <Timer className="h-3.5 w-3.5" />
                          Claim expires{" "}
                          {new Date(
                            entry.claimExpiresAt
                          ).toLocaleTimeString("en-US", {
                            hour: "2-digit",
                            minute: "2-digit",
                          })}
                        </div>
                      )}

                    {entry.status === "claimed" && (
                      <div className="flex items-center gap-1 text-xs font-medium text-blue-600">
                        <CheckCircle className="h-3.5 w-3.5" />
                        Slot claimed
                      </div>
                    )}

                    {entry.status === "expired" && (
                      <div className="flex items-center gap-1 text-xs font-medium text-beige-400">
                        <AlertTriangle className="h-3.5 w-3.5" />
                        Claim window passed
                      </div>
                    )}
                  </div>
                </motion.div>
              );
            })}
          </AnimatePresence>
        </div>
      )}

      {/* Scoring legend */}
      {ranked.length > 0 && (
        <div className="mt-8 rounded-card border border-beige-200 bg-white p-5 shadow-card">
          <h3 className="mb-3 font-serif text-sm font-semibold text-beige-700">
            Scoring Formula
          </h3>
          <p className="text-xs leading-relaxed text-beige-500">
            <strong>Score</strong> = (wait time × 0.35) + (reliability × 0.65)
            — Higher score = higher priority. Longer wait increases score, but
            poor reliability (no-shows, late cancellations) penalizes heavily.
            Users with 3+ no-shows are flagged as restricted.
          </p>
        </div>
      )}
    </div>
  );
}
