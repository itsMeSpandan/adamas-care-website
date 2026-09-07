"use client";

import { useState, useEffect, useMemo } from "react";
import { motion, AnimatePresence } from "framer-motion";

interface AuditLogEntry {
  id: string;
  action: string;
  entityType: string;
  entityId: string | null;
  adminId: string | null;
  adminName: string | null;
  adminEmail: string | null;
  details: string | null;
  ip: string | null;
  createdAt: string;
}

const ACTION_COLORS: Record<string, string> = {
  service_create: "bg-green-100 text-green-700",
  service_update: "bg-blue-100 text-blue-700",
  service_delete: "bg-red-100 text-red-700",
  employee_create: "bg-green-100 text-green-700",
  employee_update: "bg-blue-100 text-blue-700",
  employee_delete: "bg-red-100 text-red-700",
  booking_confirmed: "bg-green-100 text-green-700",
  booking_completed: "bg-blue-100 text-blue-700",
  booking_cancelled: "bg-red-100 text-red-700",
  contact_form_submit: "bg-purple-100 text-purple-700",
  holiday_create: "bg-teal-100 text-teal-700",
  holiday_delete: "bg-red-100 text-red-700",
  holiday_seed: "bg-indigo-100 text-indigo-700",
};

const ENTITY_ICONS: Record<string, string> = {
  service: "M4 6h16M4 12h16M4 18h16",
  employee: "M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2 M9 7a4 4 0 1 0 0-8 4 4 0 0 0 0 8 M22 21v-2a4 4 0 0 0-3-3.87 M16 3.13a4 4 0 0 1 0 7.75",
  booking: "M19 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11l5 5v11a2 2 0 0 1-2 2z M17 21v-8H7v8 M7 3v5h8",
  contact: "M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z M22 6l-10 7L2 6",
  holiday: "M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10",
};

function formatAction(action: string): string {
  return action
    .replace(/_/g, " ")
    .replace(/\b\w/g, (c) => c.toUpperCase());
}

function timeAgo(dateStr: string): string {
  const now = new Date();
  const date = new Date(dateStr);
  const diffMs = now.getTime() - date.getTime();
  const diffMin = Math.floor(diffMs / 60000);
  const diffHr = Math.floor(diffMin / 60);
  const diffDay = Math.floor(diffHr / 24);

  if (diffMin < 1) return "Just now";
  if (diffMin < 60) return `${diffMin}m ago`;
  if (diffHr < 24) return `${diffHr}h ago`;
  if (diffDay < 7) return `${diffDay}d ago`;
  return date.toLocaleDateString("en-US", { month: "short", day: "numeric" });
}

export default function AdminLogsPage() {
  const [logs, setLogs] = useState<AuditLogEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<string>("all");
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);
  const perPage = 25;

  useEffect(() => {
    fetch("/api/admin/audit-logs")
      .then((r) => r.json())
      .then((data) => {
        setLogs(data.logs || []);
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, []);

  const filtered = useMemo(() => {
    return logs.filter((log) => {
      if (filter !== "all" && !log.action.includes(filter)) return false;
      if (search) {
        const q = search.toLowerCase();
        return (
          log.action.includes(q) ||
          log.details?.toLowerCase().includes(q) ||
          log.adminEmail?.toLowerCase().includes(q) ||
          log.adminName?.toLowerCase().includes(q) ||
          log.ip?.includes(q)
        );
      }
      return true;
    });
  }, [logs, filter, search]);

  const totalPages = Math.ceil(filtered.length / perPage);
  const paginated = filtered.slice((page - 1) * perPage, page * perPage);

  // Stats
  const stats = useMemo(() => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const todayLogs = logs.filter(
      (l) => new Date(l.createdAt) >= today
    );
    return {
      total: logs.length,
      today: todayLogs.length,
      services: logs.filter((l) => l.entityType === "service").length,
      employees: logs.filter((l) => l.entityType === "employee").length,
      bookings: logs.filter((l) => l.entityType === "booking").length,
      holidays: logs.filter((l) => l.entityType === "holiday").length,
      contacts: logs.filter((l) => l.entityType === "contact").length,
    };
  }, [logs]);

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="font-serif text-3xl font-semibold text-beige-700">
              Audit Logs
            </h1>
            <p className="mt-1 text-beige-600">Track all admin actions</p>
          </div>
        </div>
        <div className="flex items-center justify-center py-12">
          <div className="h-8 w-8 animate-spin rounded-full border-2 border-beige-300 border-t-beige-600" />
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="font-serif text-3xl font-semibold text-beige-700">
          Audit Logs
        </h1>
        <p className="mt-1 text-beige-600">
          Track all admin actions and contact form submissions
        </p>
      </div>

      {/* Stats */}
      <div className="grid gap-3 sm:grid-cols-3 lg:grid-cols-7">
        {[
          { label: "Total", value: stats.total, color: "text-beige-700" },
          { label: "Today", value: stats.today, color: "text-blue-600" },
          { label: "Services", value: stats.services, color: "text-green-600" },
          { label: "Employees", value: stats.employees, color: "text-purple-600" },
          { label: "Bookings", value: stats.bookings, color: "text-amber-600" },
          { label: "Holidays", value: stats.holidays, color: "text-teal-600" },
          { label: "Contacts", value: stats.contacts, color: "text-rose-600" },
        ].map((stat) => (
          <div
            key={stat.label}
            className="rounded-card border border-beige-200 bg-white p-4 text-center shadow-card"
          >
            <p className="text-xs text-beige-500">{stat.label}</p>
            <p className={`mt-1 text-2xl font-bold ${stat.color}`}>
              {stat.value}
            </p>
          </div>
        ))}
      </div>

      {/* Filters */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
        <div className="relative flex-1">
          <svg
            width="16"
            height="16"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
            className="absolute left-3 top-1/2 -translate-y-1/2 text-beige-400"
          >
            <circle cx="11" cy="11" r="8" />
            <line x1="21" x2="16.65" y1="21" y2="16.65" />
          </svg>
          <input
            type="text"
            value={search}
            onChange={(e) => {
              setSearch(e.target.value);
              setPage(1);
            }}
            placeholder="Search logs..."
            className="w-full rounded-xl border border-beige-300 bg-white pl-10 pr-4 py-2.5 text-sm text-beige-800 placeholder:text-beige-400 focus:border-beige-500 focus:outline-none focus:ring-2 focus:ring-beige-200"
          />
        </div>
        <div className="flex flex-wrap gap-2">
          {[
            { key: "all", label: "All" },
            { key: "service", label: "Services" },
            { key: "employee", label: "Employees" },
            { key: "booking", label: "Bookings" },
            { key: "holiday", label: "Holidays" },
            { key: "contact", label: "Contacts" },
          ].map((f) => (
            <button
              key={f.key}
              onClick={() => {
                setFilter(f.key);
                setPage(1);
              }}
              className={`rounded-full border px-3 py-1.5 text-xs font-medium transition-all ${
                filter === f.key
                  ? "border-beige-600 bg-beige-600 text-white"
                  : "border-beige-300 bg-white text-beige-600 hover:border-beige-400"
              }`}
            >
              {f.label}
            </button>
          ))}
        </div>
      </div>

      {/* Log entries */}
      <div className="rounded-card border border-beige-200 bg-white shadow-card">
        {paginated.length === 0 ? (
          <div className="py-12 text-center text-sm text-beige-400">
            No audit logs found.
          </div>
        ) : (
          <div className="divide-y divide-beige-50">
            <AnimatePresence>
              {paginated.map((log) => (
                <motion.div
                  key={log.id}
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  className="flex items-start gap-4 px-5 py-4 transition-colors hover:bg-beige-50"
                >
                  {/* Action icon */}
                  <div className="mt-0.5 flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-full bg-beige-100">
                    <svg
                      width="14"
                      height="14"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="2"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      className="text-beige-500"
                    >
                      <path d={ENTITY_ICONS[log.entityType] || ENTITY_ICONS.booking} />
                    </svg>
                  </div>

                  {/* Content */}
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span
                        className={`inline-block rounded-full px-2 py-0.5 text-[10px] font-medium ${
                          ACTION_COLORS[log.action] || "bg-beige-100 text-beige-600"
                        }`}
                      >
                        {formatAction(log.action)}
                      </span>
                      <span className="text-[10px] text-beige-400">
                        {log.entityType}
                        {log.entityId && ` · ${log.entityId.slice(0, 12)}`}
                      </span>
                    </div>
                    {log.details && (
                      <p className="mt-1 text-xs text-beige-600 truncate max-w-lg">
                        {log.details}
                      </p>
                    )}
                    <div className="mt-1 flex items-center gap-3 text-[10px] text-beige-400">
                      {log.adminEmail && <span>{log.adminEmail}</span>}
                      {log.ip && log.ip !== "unknown" && (
                        <span className="font-mono">{log.ip}</span>
                      )}
                      <span>{timeAgo(log.createdAt)}</span>
                    </div>
                  </div>

                  {/* Timestamp */}
                  <span className="flex-shrink-0 text-[10px] text-beige-400 font-mono">
                    {new Date(log.createdAt).toLocaleTimeString("en-US", {
                      hour: "2-digit",
                      minute: "2-digit",
                    })}
                  </span>
                </motion.div>
              ))}
            </AnimatePresence>
          </div>
        )}

        {/* Pagination */}
        {totalPages > 1 && (
          <div className="flex items-center justify-between border-t border-beige-100 px-5 py-3">
            <span className="text-xs text-beige-500">
              Showing {(page - 1) * perPage + 1}–{Math.min(page * perPage, filtered.length)} of{" "}
              {filtered.length}
            </span>
            <div className="flex gap-1">
              <button
                onClick={() => setPage(Math.max(1, page - 1))}
                disabled={page === 1}
                className="rounded-lg px-3 py-1 text-xs font-medium text-beige-600 transition-colors hover:bg-beige-100 disabled:opacity-30"
              >
                ← Prev
              </button>
              <button
                onClick={() => setPage(Math.min(totalPages, page + 1))}
                disabled={page === totalPages}
                className="rounded-lg px-3 py-1 text-xs font-medium text-beige-600 transition-colors hover:bg-beige-100 disabled:opacity-30"
              >
                Next →
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
