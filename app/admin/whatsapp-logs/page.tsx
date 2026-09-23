"use client";

import { useState, useEffect, useCallback } from "react";
import { format } from "date-fns";

interface WhatsAppLog {
  id: string;
  phoneNumber: string;
  messageType: string;
  templateName: string | null;
  status: string;
  errorMessage: string | null;
  responseCode: number | null;
  durationMs: number | null;
  createdAt: string;
}

interface LogStats {
  byStatus: Array<{ status: string; count: number }>;
  byType: Array<{ type: string; count: number }>;
}

export default function WhatsAppLogsPage() {
  const [logs, setLogs] = useState<WhatsAppLog[]>([]);
  const [stats, setStats] = useState<LogStats | null>(null);
  const [pagination, setPagination] = useState({ page: 1, limit: 50, total: 0, totalPages: 0 });
  const [loading, setLoading] = useState(true);
  const [filters, setFilters] = useState({
    messageType: "",
    status: "",
    phoneNumber: "",
    from: "",
    to: "",
  });
  const [expandedLog, setExpandedLog] = useState<string | null>(null);

  const fetchLogs = useCallback(async (page = 1) => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      params.set("page", String(page));
      params.set("limit", "50");
      if (filters.messageType) params.set("messageType", filters.messageType);
      if (filters.status) params.set("status", filters.status);
      if (filters.phoneNumber) params.set("phoneNumber", filters.phoneNumber);
      if (filters.from) params.set("from", filters.from);
      if (filters.to) params.set("to", filters.to);

      const res = await fetch(`/api/admin/whatsapp-logs?${params.toString()}`);
      const data = await res.json();
      setLogs(data.logs || []);
      setStats(data.stats || null);
      setPagination(data.pagination || { page: 1, limit: 50, total: 0, totalPages: 0 });
    } catch {
      console.error("Failed to fetch WhatsApp logs");
    } finally {
      setLoading(false);
    }
  }, [filters]);

  useEffect(() => {
    fetchLogs(1);
  }, [fetchLogs]);

  const getStatusColor = (status: string) => {
    switch (status) {
      case "sent": return "bg-green-100 text-green-700";
      case "delivered": return "bg-blue-100 text-blue-700";
      case "read": return "bg-purple-100 text-purple-700";
      case "failed": return "bg-red-100 text-red-700";
      default: return "bg-gray-100 text-gray-700";
    }
  };

  const getMessageTypeLabel = (type: string) => {
    switch (type) {
      case "otp": return "OTP Verification";
      case "booking_confirmation": return "Booking Confirmation";
      case "slot_available": return "Slot Available";
      case "text": return "Text Message";
      default: return type;
    }
  };

  return (
    <div className="min-h-screen bg-beige-50 p-6">
      <div className="mx-auto max-w-7xl">
        <div className="mb-8">
          <h1 className="font-serif text-3xl font-semibold text-beige-700">
            WhatsApp Message Logs
          </h1>
          <p className="mt-2 text-beige-600">
            Track all WhatsApp API messages sent by the system
          </p>
        </div>

        {/* Stats Cards */}
        {stats && (
          <div className="mb-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <div className="rounded-card border border-beige-200 bg-white p-4 shadow-sm">
              <p className="text-sm text-beige-500">Total Messages</p>
              <p className="mt-1 text-2xl font-semibold text-beige-700">
                {stats.byStatus.reduce((sum, s) => sum + s.count, 0)}
              </p>
            </div>
            <div className="rounded-card border border-beige-200 bg-white p-4 shadow-sm">
              <p className="text-sm text-beige-500">Successful</p>
              <p className="mt-1 text-2xl font-semibold text-green-600">
                {stats.byStatus.find((s) => s.status === "sent")?.count || 0}
              </p>
            </div>
            <div className="rounded-card border border-beige-200 bg-white p-4 shadow-sm">
              <p className="text-sm text-beige-500">Failed</p>
              <p className="mt-1 text-2xl font-semibold text-red-600">
                {stats.byStatus.find((s) => s.status === "failed")?.count || 0}
              </p>
            </div>
            <div className="rounded-card border border-beige-200 bg-white p-4 shadow-sm">
              <p className="text-sm text-beige-500">By Type</p>
              <div className="mt-1 flex flex-wrap gap-2">
                {stats.byType.map((t) => (
                  <span key={t.type} className="rounded-full bg-beige-100 px-2 py-0.5 text-xs text-beige-600">
                    {getMessageTypeLabel(t.type)}: {t.count}
                  </span>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* Filters */}
        <div className="mb-6 rounded-card border border-beige-200 bg-white p-4 shadow-sm">
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-5">
            <div>
              <label className="mb-1 block text-sm font-medium text-beige-700">Message Type</label>
              <select
                value={filters.messageType}
                onChange={(e) => setFilters({ ...filters, messageType: e.target.value })}
                className="w-full rounded-lg border border-beige-300 px-3 py-2 text-sm"
              >
                <option value="">All Types</option>
                <option value="otp">OTP</option>
                <option value="booking_confirmation">Booking Confirmation</option>
                <option value="slot_available">Slot Available</option>
                <option value="text">Text</option>
              </select>
            </div>
            <div>
              <label className="mb-1 block text-sm font-medium text-beige-700">Status</label>
              <select
                value={filters.status}
                onChange={(e) => setFilters({ ...filters, status: e.target.value })}
                className="w-full rounded-lg border border-beige-300 px-3 py-2 text-sm"
              >
                <option value="">All Statuses</option>
                <option value="sent">Sent</option>
                <option value="failed">Failed</option>
              </select>
            </div>
            <div>
              <label className="mb-1 block text-sm font-medium text-beige-700">Phone Number</label>
              <input
                type="text"
                value={filters.phoneNumber}
                onChange={(e) => setFilters({ ...filters, phoneNumber: e.target.value })}
                placeholder="Search by phone..."
                className="w-full rounded-lg border border-beige-300 px-3 py-2 text-sm"
              />
            </div>
            <div>
              <label className="mb-1 block text-sm font-medium text-beige-700">From Date</label>
              <input
                type="date"
                value={filters.from}
                onChange={(e) => setFilters({ ...filters, from: e.target.value })}
                className="w-full rounded-lg border border-beige-300 px-3 py-2 text-sm"
              />
            </div>
            <div>
              <label className="mb-1 block text-sm font-medium text-beige-700">To Date</label>
              <input
                type="date"
                value={filters.to}
                onChange={(e) => setFilters({ ...filters, to: e.target.value })}
                className="w-full rounded-lg border border-beige-300 px-3 py-2 text-sm"
              />
            </div>
          </div>
          <div className="mt-4 flex gap-2">
            <button
              onClick={() => fetchLogs(1)}
              className="rounded-lg bg-beige-600 px-4 py-2 text-sm font-medium text-white hover:bg-beige-700"
            >
              Apply Filters
            </button>
            <button
              onClick={() => {
                setFilters({ messageType: "", status: "", phoneNumber: "", from: "", to: "" });
              }}
              className="rounded-lg border border-beige-300 px-4 py-2 text-sm font-medium text-beige-700 hover:bg-beige-50"
            >
              Clear
            </button>
          </div>
        </div>

        {/* Logs Table */}
        <div className="rounded-card border border-beige-200 bg-white shadow-sm">
          {loading ? (
            <div className="flex items-center justify-center py-12">
              <div className="h-8 w-8 animate-spin rounded-full border-2 border-beige-300 border-t-beige-600" />
            </div>
          ) : logs.length === 0 ? (
            <div className="py-12 text-center text-beige-500">
              No WhatsApp messages found matching your filters.
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-beige-200 bg-beige-50">
                    <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-beige-500">
                      Time
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-beige-500">
                      Phone
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-beige-500">
                      Type
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-beige-500">
                      Status
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-beige-500">
                      Response
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-beige-500">
                      Duration
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-beige-500">
                      Details
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-beige-100">
                  {logs.map((log) => (
                    <>
                      <tr key={log.id} className="hover:bg-beige-50">
                        <td className="whitespace-nowrap px-4 py-3 text-sm text-beige-600">
                          {format(new Date(log.createdAt), "MMM d, HH:mm:ss")}
                        </td>
                        <td className="whitespace-nowrap px-4 py-3 text-sm font-mono text-beige-700">
                          {log.phoneNumber}
                        </td>
                        <td className="whitespace-nowrap px-4 py-3 text-sm text-beige-600">
                          {getMessageTypeLabel(log.messageType)}
                          {log.templateName && (
                            <span className="ml-1 text-xs text-beige-400">({log.templateName})</span>
                          )}
                        </td>
                        <td className="whitespace-nowrap px-4 py-3">
                          <span className={`inline-flex rounded-full px-2 py-1 text-xs font-medium ${getStatusColor(log.status)}`}>
                            {log.status}
                          </span>
                        </td>
                        <td className="whitespace-nowrap px-4 py-3 text-sm text-beige-600">
                          {log.responseCode || "—"}
                        </td>
                        <td className="whitespace-nowrap px-4 py-3 text-sm text-beige-600">
                          {log.durationMs ? `${log.durationMs}ms` : "—"}
                        </td>
                        <td className="whitespace-nowrap px-4 py-3">
                          <button
                            onClick={() => setExpandedLog(expandedLog === log.id ? null : log.id)}
                            className="text-sm text-beige-600 hover:text-beige-800"
                          >
                            {expandedLog === log.id ? "Hide" : "Show"}
                          </button>
                        </td>
                      </tr>
                      {expandedLog === log.id && (
                        <tr key={`${log.id}-details`}>
                          <td colSpan={7} className="border-t border-beige-100 bg-beige-50 px-4 py-4">
                            <div className="grid gap-4 sm:grid-cols-2">
                              {log.errorMessage && (
                                <div>
                                  <p className="mb-1 text-xs font-medium text-beige-500">Error</p>
                                  <pre className="max-h-32 overflow-auto rounded bg-red-50 p-2 text-xs text-red-700">
                                    {log.errorMessage}
                                  </pre>
                                </div>
                              )}
                            </div>
                          </td>
                        </tr>
                      )}
                    </>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          {/* Pagination */}
          {pagination.totalPages > 1 && (
            <div className="flex items-center justify-between border-t border-beige-200 px-4 py-3">
              <p className="text-sm text-beige-500">
                Showing {((pagination.page - 1) * pagination.limit) + 1} to{" "}
                {Math.min(pagination.page * pagination.limit, pagination.total)} of{" "}
                {pagination.total} messages
              </p>
              <div className="flex gap-2">
                <button
                  onClick={() => fetchLogs(pagination.page - 1)}
                  disabled={pagination.page === 1}
                  className="rounded border border-beige-300 px-3 py-1 text-sm disabled:opacity-50"
                >
                  Previous
                </button>
                <button
                  onClick={() => fetchLogs(pagination.page + 1)}
                  disabled={pagination.page === pagination.totalPages}
                  className="rounded border border-beige-300 px-3 py-1 text-sm disabled:opacity-50"
                >
                  Next
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
