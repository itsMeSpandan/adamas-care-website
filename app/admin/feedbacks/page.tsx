"use client";

import { useEffect, useState, useCallback } from "react";
import Image from "next/image";

interface FeedbackItem {
  id: string;
  source: "app" | "legacy";
  overallRating: number;
  npsScore: number | null;
  overallTags: string[];
  overallComment: string | null;
  status: "NEW" | "REVIEWED" | "FOLLOW_UP" | "RESOLVED";
  isFlagged: boolean;
  adminNotes: string | null;
  reviewedBy: string | null;
  createdAt: string;
  user: { id: string; name: string; email: string; avatarUrl: string } | null;
  booking: {
    id: string;
    date: string;
    slotStart: string | null;
    timeSlot: string;
    price: number;
    name: string;
    email: string;
    employee: { id: string; name: string } | null;
  };
  employeeRatings: Array<{
    id: string;
    rating: number;
    tags: string[];
    comment: string | null;
    employee: { id: string; name: string; role: string; imageUrl: string };
  }>;
  serviceRatings: Array<{
    id: string;
    rating: number;
    tags: string[];
    comment: string | null;
    service: { id: string; name: string; category: string };
  }>;
}

interface SummaryData {
  totalResponses: number;
  overallAverage: number;
  employeeAverage: number | null;
  serviceAverage: number | null;
  nps: {
    score: number | null;
    promoters: number;
    passives: number;
    detractors: number;
    total: number;
    hasMinimumSample: boolean;
    minimumRequired: number;
  };
  responseRate: {
    percentage: number;
    submitted: number;
    eligibleCompletedBookings: number;
  };
  ratingDistribution: Record<number, number>;
  statusCounts: Record<string, number>;
  flaggedCount: number;
}

interface BreakdownData {
  employees: Array<{
    id: string;
    name: string;
    role: string;
    imageUrl: string;
    responseCount: number;
    averageRating: number | null;
    hasMinimumSample: boolean;
    topTags: Array<{ tag: string; count: number }>;
  }>;
  services: Array<{
    id: string;
    name: string;
    category: string;
    responseCount: number;
    averageRating: number | null;
    hasMinimumSample: boolean;
    topTags: Array<{ tag: string; count: number }>;
  }>;
  minimumSampleThreshold: number;
}

export default function AdminFeedbacksPage() {
  const [loading, setLoading] = useState(true);
  const [feedbacks, setFeedbacks] = useState<FeedbackItem[]>([]);
  const [summary, setSummary] = useState<SummaryData | null>(null);
  const [breakdown, setBreakdown] = useState<BreakdownData | null>(null);
  const [activeTab, setActiveTab] = useState<"list" | "employees" | "services">("list");

  // Filters
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [statusFilter, setStatusFilter] = useState<string>("");
  const [flaggedFilter, setFlaggedFilter] = useState<string>("");
  const [sourceFilter, setSourceFilter] = useState<string>("");
  const [ratingFilter, setRatingFilter] = useState<string>("");
  const [hasCommentFilter, setHasCommentFilter] = useState<string>("");

  // Follow-up drawer / modal state
  const [selectedFeedback, setSelectedFeedback] = useState<FeedbackItem | null>(null);
  const [drawerStatus, setDrawerStatus] = useState<string>("NEW");
  const [drawerNotes, setDrawerNotes] = useState<string>("");
  const [savingDrawer, setSavingDrawer] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);

  // Fetch Summary & Breakdowns
  const fetchOverview = useCallback(async () => {
    try {
      const [sumRes, breakRes] = await Promise.all([
        fetch("/api/admin/feedbacks/summary"),
        fetch("/api/admin/feedbacks/breakdown"),
      ]);
      if (sumRes.ok) setSummary(await sumRes.json());
      if (breakRes.ok) setBreakdown(await breakRes.json());
    } catch (err) {
      console.error("Failed to load feedback overview:", err);
    }
  }, []);

  // Fetch Feedbacks List
  const fetchFeedbacks = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({
        page: String(page),
        limit: "15",
      });
      if (statusFilter) params.set("status", statusFilter);
      if (flaggedFilter) params.set("isFlagged", flaggedFilter);
      if (sourceFilter) params.set("source", sourceFilter);
      if (ratingFilter) {
        params.set("minRating", ratingFilter);
        params.set("maxRating", ratingFilter);
      }
      if (hasCommentFilter) params.set("hasComment", hasCommentFilter);

      const res = await fetch(`/api/admin/feedbacks?${params.toString()}`);
      if (res.ok) {
        const data = await res.json();
        setFeedbacks(data.feedbacks);
        setTotalPages(data.pagination.totalPages || 1);
      }
    } catch (err) {
      console.error("Failed to fetch feedbacks list:", err);
    } finally {
      setLoading(false);
    }
  }, [page, statusFilter, flaggedFilter, sourceFilter, ratingFilter, hasCommentFilter]);

  useEffect(() => {
    fetchOverview();
  }, [fetchOverview]);

  useEffect(() => {
    fetchFeedbacks();
  }, [fetchFeedbacks]);

  const handleOpenDrawer = (fb: FeedbackItem) => {
    setSelectedFeedback(fb);
    setDrawerStatus(fb.status);
    setDrawerNotes(fb.adminNotes || "");
    setSaveSuccess(false);
  };

  const handleSaveDrawer = async () => {
    if (!selectedFeedback) return;
    setSavingDrawer(true);
    setSaveSuccess(false);
    try {
      const res = await fetch(`/api/admin/feedbacks/${selectedFeedback.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          status: drawerStatus,
          adminNotes: drawerNotes,
        }),
      });
      if (res.ok) {
        setSaveSuccess(true);
        // Refresh local feedback item and list
        setFeedbacks((prev) =>
          prev.map((item) =>
            item.id === selectedFeedback.id
              ? { ...item, status: drawerStatus as FeedbackItem["status"], adminNotes: drawerNotes }
              : item
          )
        );
        fetchOverview();
        setTimeout(() => setSelectedFeedback(null), 800);
      }
    } catch (err) {
      console.error("Failed to update feedback status:", err);
    } finally {
      setSavingDrawer(false);
    }
  };

  const handleExportCsv = () => {
    const params = new URLSearchParams();
    if (statusFilter) params.set("status", statusFilter);
    if (flaggedFilter) params.set("isFlagged", flaggedFilter);
    if (sourceFilter) params.set("source", sourceFilter);
    if (ratingFilter) {
      params.set("minRating", ratingFilter);
      params.set("maxRating", ratingFilter);
    }
    window.open(`/api/admin/feedbacks/export?${params.toString()}`, "_blank");
  };

  return (
    <div className="space-y-8">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="font-serif text-3xl font-bold text-beige-800">Customer Feedbacks</h1>
          <p className="mt-1 text-sm text-beige-600">
            Multi-level ratings and follow-up management for Adamas Care visits.
          </p>
        </div>
        <button
          type="button"
          onClick={handleExportCsv}
          className="inline-flex items-center gap-2 rounded-lg border border-beige-300 bg-white px-4 py-2.5 text-xs font-semibold text-beige-700 shadow-xs hover:bg-beige-50 transition-colors"
        >
          <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
            <polyline points="7 10 12 15 17 10" />
            <line x1="12" y1="15" x2="12" y2="3" />
          </svg>
          Export CSV (Safe)
        </button>
      </div>

      {/* KPI Summary Cards */}
      {summary && (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {/* Overall Rating Card */}
          <div className="rounded-xl border border-beige-200 bg-white p-5 shadow-xs">
            <div className="flex items-center justify-between text-xs font-semibold uppercase tracking-wider text-beige-500">
              <span>Overall Average</span>
              <span className="text-amber-500">★</span>
            </div>
            <div className="mt-2 flex items-baseline gap-2">
              <span className="text-3xl font-bold text-beige-800">
                {summary.overallAverage > 0 ? summary.overallAverage.toFixed(1) : "—"}
              </span>
              <span className="text-xs text-beige-500">/ 5.0</span>
            </div>
            <p className="mt-2 text-xs text-beige-500">
              Across {summary.totalResponses} total response{summary.totalResponses !== 1 ? "s" : ""}
            </p>
          </div>

          {/* NPS Card */}
          <div className="rounded-xl border border-beige-200 bg-white p-5 shadow-xs">
            <div className="flex items-center justify-between text-xs font-semibold uppercase tracking-wider text-beige-500">
              <span>Net Promoter Score</span>
              <span className="text-xs font-bold text-beige-400">NPS</span>
            </div>
            <div className="mt-2 flex items-baseline gap-2">
              {summary.nps.hasMinimumSample ? (
                <>
                  <span
                    className={`text-3xl font-bold ${
                      (summary.nps.score ?? 0) >= 50
                        ? "text-emerald-600"
                        : (summary.nps.score ?? 0) >= 0
                        ? "text-amber-600"
                        : "text-red-600"
                    }`}
                  >
                    {summary.nps.score && summary.nps.score > 0 ? `+${summary.nps.score}` : summary.nps.score}
                  </span>
                  <span className="text-xs text-beige-500">score</span>
                </>
              ) : (
                <span className="text-sm font-semibold text-beige-400 italic">
                  Collecting sample ({summary.nps.total}/{summary.nps.minimumRequired})
                </span>
              )}
            </div>
            <p className="mt-2 text-xs text-beige-500">
              {summary.nps.promoters} Promoters • {summary.nps.detractors} Detractors
            </p>
          </div>

          {/* Response Rate Card */}
          <div className="rounded-xl border border-beige-200 bg-white p-5 shadow-xs">
            <div className="flex items-center justify-between text-xs font-semibold uppercase tracking-wider text-beige-500">
              <span>Response Rate</span>
              <span>📈</span>
            </div>
            <div className="mt-2 flex items-baseline gap-2">
              <span className="text-3xl font-bold text-beige-800">
                {summary.responseRate.percentage}%
              </span>
            </div>
            <p className="mt-2 text-xs text-beige-500">
              {summary.responseRate.submitted} of {summary.responseRate.eligibleCompletedBookings} account visits
            </p>
          </div>

          {/* Follow-up / Flagged Card */}
          <div className="rounded-xl border border-beige-200 bg-white p-5 shadow-xs">
            <div className="flex items-center justify-between text-xs font-semibold uppercase tracking-wider text-beige-500">
              <span>Follow-up Flags</span>
              <span className="text-red-500">🚩</span>
            </div>
            <div className="mt-2 flex items-baseline gap-2">
              <span className={`text-3xl font-bold ${summary.flaggedCount > 0 ? "text-red-600" : "text-beige-800"}`}>
                {summary.flaggedCount}
              </span>
              <span className="text-xs text-beige-500">≤ 2 stars</span>
            </div>
            <p className="mt-2 text-xs text-beige-500">
              {summary.statusCounts.NEW || 0} New • {summary.statusCounts.FOLLOW_UP || 0} In Progress
            </p>
          </div>
        </div>
      )}

      {/* Navigation Tabs (List vs Employee Breakdown vs Service Breakdown) */}
      <div className="flex border-b border-beige-200 gap-6">
        <button
          type="button"
          onClick={() => setActiveTab("list")}
          className={`pb-3 text-sm font-semibold border-b-2 transition-all ${
            activeTab === "list"
              ? "border-[#C97B5C] text-[#C97B5C]"
              : "border-transparent text-beige-500 hover:text-beige-700"
          }`}
        >
          All Feedbacks ({summary?.totalResponses ?? 0})
        </button>
        <button
          type="button"
          onClick={() => setActiveTab("employees")}
          className={`pb-3 text-sm font-semibold border-b-2 transition-all ${
            activeTab === "employees"
              ? "border-[#C97B5C] text-[#C97B5C]"
              : "border-transparent text-beige-500 hover:text-beige-700"
          }`}
        >
          Specialist Breakdown
        </button>
        <button
          type="button"
          onClick={() => setActiveTab("services")}
          className={`pb-3 text-sm font-semibold border-b-2 transition-all ${
            activeTab === "services"
              ? "border-[#C97B5C] text-[#C97B5C]"
              : "border-transparent text-beige-500 hover:text-beige-700"
          }`}
        >
          Service Breakdown
        </button>
      </div>

      {/* ─── TAB 1: Feedbacks List ─── */}
      {activeTab === "list" && (
        <div className="space-y-4">
          {/* Filter Bar */}
          <div className="grid grid-cols-2 sm:grid-cols-5 gap-3 rounded-xl border border-beige-200 bg-white p-4 shadow-2xs">
            {/* Status Filter */}
            <div>
              <label className="block text-[11px] font-semibold uppercase tracking-wider text-beige-500 mb-1">
                Status
              </label>
              <select
                value={statusFilter}
                onChange={(e) => {
                  setStatusFilter(e.target.value);
                  setPage(1);
                }}
                className="w-full rounded-md border border-beige-300 py-1.5 px-2 text-xs focus:border-[#C97B5C] focus:outline-none"
              >
                <option value="">All Statuses</option>
                <option value="NEW">New</option>
                <option value="REVIEWED">Reviewed</option>
                <option value="FOLLOW_UP">Follow-up</option>
                <option value="RESOLVED">Resolved</option>
              </select>
            </div>

            {/* Flagged Filter */}
            <div>
              <label className="block text-[11px] font-semibold uppercase tracking-wider text-beige-500 mb-1">
                Flagged
              </label>
              <select
                value={flaggedFilter}
                onChange={(e) => {
                  setFlaggedFilter(e.target.value);
                  setPage(1);
                }}
                className="w-full rounded-md border border-beige-300 py-1.5 px-2 text-xs focus:border-[#C97B5C] focus:outline-none"
              >
                <option value="">All</option>
                <option value="true">Flagged (≤ 2★)</option>
                <option value="false">Unflagged</option>
              </select>
            </div>

            {/* Rating Filter */}
            <div>
              <label className="block text-[11px] font-semibold uppercase tracking-wider text-beige-500 mb-1">
                Overall Stars
              </label>
              <select
                value={ratingFilter}
                onChange={(e) => {
                  setRatingFilter(e.target.value);
                  setPage(1);
                }}
                className="w-full rounded-md border border-beige-300 py-1.5 px-2 text-xs focus:border-[#C97B5C] focus:outline-none"
              >
                <option value="">Any Stars</option>
                <option value="5">5 Stars</option>
                <option value="4">4 Stars</option>
                <option value="3">3 Stars</option>
                <option value="2">2 Stars</option>
                <option value="1">1 Star</option>
              </select>
            </div>

            {/* Comment Filter */}
            <div>
              <label className="block text-[11px] font-semibold uppercase tracking-wider text-beige-500 mb-1">
                Comment
              </label>
              <select
                value={hasCommentFilter}
                onChange={(e) => {
                  setHasCommentFilter(e.target.value);
                  setPage(1);
                }}
                className="w-full rounded-md border border-beige-300 py-1.5 px-2 text-xs focus:border-[#C97B5C] focus:outline-none"
              >
                <option value="">All</option>
                <option value="true">With comments only</option>
              </select>
            </div>

            {/* Source Filter */}
            <div>
              <label className="block text-[11px] font-semibold uppercase tracking-wider text-beige-500 mb-1">
                Source
              </label>
              <select
                value={sourceFilter}
                onChange={(e) => {
                  setSourceFilter(e.target.value);
                  setPage(1);
                }}
                className="w-full rounded-md border border-beige-300 py-1.5 px-2 text-xs focus:border-[#C97B5C] focus:outline-none"
              >
                <option value="">All Sources</option>
                <option value="app">App (3-level)</option>
                <option value="legacy">Legacy backfill</option>
              </select>
            </div>
          </div>

          {/* List Table / Cards */}
          {loading ? (
            <div className="flex h-48 items-center justify-center">
              <div className="h-6 w-6 animate-spin rounded-full border-2 border-beige-300 border-t-[#C97B5C]" />
            </div>
          ) : feedbacks.length === 0 ? (
            <div className="rounded-xl border border-beige-200 bg-white p-12 text-center">
              <p className="text-sm font-semibold text-beige-700">No feedbacks match your filters</p>
              <p className="mt-1 text-xs text-beige-400">Try clearing one or more filters above.</p>
            </div>
          ) : (
            <div className="divide-y divide-beige-100 rounded-xl border border-beige-200 bg-white shadow-xs">
              {feedbacks.map((fb) => {
                const customerName = fb.user?.name || fb.booking.name || "Customer";
                const customerEmail = fb.user?.email || fb.booking.email;
                const dateStr = new Date(fb.createdAt).toLocaleDateString("en-IN", {
                  day: "numeric",
                  month: "short",
                  year: "numeric",
                });

                return (
                  <div key={fb.id} className="p-5 hover:bg-beige-50/40 transition-colors">
                    <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-3">
                      <div>
                        {/* Header line: Customer + Date + Source */}
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="font-semibold text-sm text-beige-800">{customerName}</span>
                          <span className="text-xs text-beige-400">({customerEmail})</span>
                          <span className="text-xs text-beige-400">• {dateStr}</span>
                          {fb.source === "legacy" && (
                            <span className="rounded bg-beige-100 px-2 py-0.5 text-[10px] font-semibold text-beige-600">
                              Legacy
                            </span>
                          )}
                          {fb.isFlagged && (
                            <span className="rounded bg-red-100 px-2 py-0.5 text-[10px] font-bold text-red-700 border border-red-200">
                              🚩 Flagged (≤ 2★)
                            </span>
                          )}
                        </div>

                        {/* Overall Rating & NPS */}
                        <div className="mt-2 flex items-center gap-2">
                          <div className="flex items-center text-amber-500 font-bold text-sm">
                            ★ {fb.overallRating} / 5
                          </div>
                          {fb.npsScore !== null && (
                            <span className="text-xs text-beige-500">
                              • NPS: <strong className="text-beige-700">{fb.npsScore}</strong>/10
                            </span>
                          )}
                        </div>

                        {/* Quick Tags */}
                        {fb.overallTags && fb.overallTags.length > 0 && (
                          <div className="mt-2 flex flex-wrap gap-1">
                            {fb.overallTags.map((t) => (
                              <span
                                key={t}
                                className="rounded bg-beige-100 px-2 py-0.5 text-[11px] font-medium text-beige-700"
                              >
                                {t}
                              </span>
                            ))}
                          </div>
                        )}

                        {/* Comment */}
                        {fb.overallComment && (
                          <p className="mt-2 text-xs text-beige-700 italic bg-beige-50/70 p-2.5 rounded-lg border border-beige-200/60 max-w-2xl">
                            &ldquo;{fb.overallComment}&rdquo;
                          </p>
                        )}

                        {/* Multi-level ratings summary */}
                        {(fb.employeeRatings.length > 0 || fb.serviceRatings.length > 0) && (
                          <div className="mt-3 flex flex-wrap gap-4 text-xs text-beige-600 border-t border-beige-100 pt-2">
                            {fb.employeeRatings.map((er) => (
                              <span key={er.id} className="inline-flex items-center gap-1 font-medium">
                                Specialist {er.employee.name}:{" "}
                                <strong className="text-amber-600">★ {er.rating}</strong>
                              </span>
                            ))}
                            {fb.serviceRatings.map((sr) => (
                              <span key={sr.id} className="inline-flex items-center gap-1 font-medium">
                                {sr.service.name}:{" "}
                                <strong className="text-amber-600">★ {sr.rating}</strong>
                              </span>
                            ))}
                          </div>
                        )}
                      </div>

                      {/* Right side: Status Badge & Action */}
                      <div className="flex sm:flex-col items-center sm:items-end justify-between sm:justify-start gap-2 shrink-0">
                        <span
                          className={`rounded-full px-2.5 py-0.5 text-xs font-semibold ${
                            fb.status === "NEW"
                              ? "bg-blue-100 text-blue-800"
                              : fb.status === "REVIEWED"
                              ? "bg-purple-100 text-purple-800"
                              : fb.status === "FOLLOW_UP"
                              ? "bg-amber-100 text-amber-800"
                              : "bg-emerald-100 text-emerald-800"
                          }`}
                        >
                          {fb.status === "NEW"
                            ? "New"
                            : fb.status === "REVIEWED"
                            ? "Reviewed"
                            : fb.status === "FOLLOW_UP"
                            ? "Follow-up"
                            : "Resolved"}
                        </span>

                        <button
                          type="button"
                          onClick={() => handleOpenDrawer(fb)}
                          className="rounded-lg border border-beige-300 bg-white px-3 py-1.5 text-xs font-semibold text-beige-700 hover:bg-beige-50 shadow-2xs"
                        >
                          Manage →
                        </button>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}

          {/* Pagination */}
          {totalPages > 1 && (
            <div className="flex items-center justify-between pt-2">
              <span className="text-xs text-beige-500">
                Page {page} of {totalPages}
              </span>
              <div className="flex gap-2">
                <button
                  type="button"
                  disabled={page <= 1}
                  onClick={() => setPage((p) => Math.max(1, p - 1))}
                  className="rounded border border-beige-300 px-3 py-1 text-xs font-medium text-beige-700 hover:bg-beige-50 disabled:opacity-40"
                >
                  Previous
                </button>
                <button
                  type="button"
                  disabled={page >= totalPages}
                  onClick={() => setPage((p) => p + 1)}
                  className="rounded border border-beige-300 px-3 py-1 text-xs font-medium text-beige-700 hover:bg-beige-50 disabled:opacity-40"
                >
                  Next
                </button>
              </div>
            </div>
          )}
        </div>
      )}

      {/* ─── TAB 2: Specialist Breakdown ─── */}
      {activeTab === "employees" && breakdown && (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {breakdown.employees.map((emp) => (
            <div key={emp.id} className="rounded-xl border border-beige-200 bg-white p-5 shadow-xs space-y-3">
              <div className="flex items-center gap-3">
                {emp.imageUrl && (
                  <div className="relative h-12 w-12 overflow-hidden rounded-full border border-beige-200">
                    <Image src={emp.imageUrl} alt={emp.name} fill className="object-cover" sizes="48px" />
                  </div>
                )}
                <div>
                  <h3 className="font-semibold text-sm text-beige-800">{emp.name}</h3>
                  <p className="text-xs text-beige-500">{emp.role}</p>
                </div>
              </div>

              <div className="flex items-baseline justify-between border-t border-beige-100 pt-3">
                <div>
                  <span className="text-xs text-beige-400 block font-semibold uppercase">Rating</span>
                  {emp.hasMinimumSample ? (
                    <span className="text-xl font-bold text-amber-500">
                      ★ {emp.averageRating?.toFixed(1)}
                    </span>
                  ) : (
                    <span className="text-xs italic text-beige-400">
                      Building sample ({emp.responseCount}/{breakdown.minimumSampleThreshold})
                    </span>
                  )}
                </div>
                <div className="text-right">
                  <span className="text-xs text-beige-400 block font-semibold uppercase">Reviews</span>
                  <span className="text-sm font-bold text-beige-700">{emp.responseCount}</span>
                </div>
              </div>

              {emp.topTags && emp.topTags.length > 0 && (
                <div className="flex flex-wrap gap-1 pt-1">
                  {emp.topTags.map((t) => (
                    <span key={t.tag} className="rounded bg-beige-100 px-2 py-0.5 text-[10px] font-medium text-beige-700">
                      {t.tag} ({t.count})
                    </span>
                  ))}
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {/* ─── TAB 3: Service Breakdown ─── */}
      {activeTab === "services" && breakdown && (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {breakdown.services.map((srv) => (
            <div key={srv.id} className="rounded-xl border border-beige-200 bg-white p-5 shadow-xs space-y-3">
              <div>
                <span className="text-[10px] font-bold uppercase tracking-wider text-[#C97B5C]">
                  {srv.category}
                </span>
                <h3 className="font-semibold text-sm text-beige-800 mt-0.5">{srv.name}</h3>
              </div>

              <div className="flex items-baseline justify-between border-t border-beige-100 pt-3">
                <div>
                  <span className="text-xs text-beige-400 block font-semibold uppercase">Rating</span>
                  {srv.hasMinimumSample ? (
                    <span className="text-xl font-bold text-amber-500">
                      ★ {srv.averageRating?.toFixed(1)}
                    </span>
                  ) : (
                    <span className="text-xs italic text-beige-400">
                      Building sample ({srv.responseCount}/{breakdown.minimumSampleThreshold})
                    </span>
                  )}
                </div>
                <div className="text-right">
                  <span className="text-xs text-beige-400 block font-semibold uppercase">Reviews</span>
                  <span className="text-sm font-bold text-beige-700">{srv.responseCount}</span>
                </div>
              </div>

              {srv.topTags && srv.topTags.length > 0 && (
                <div className="flex flex-wrap gap-1 pt-1">
                  {srv.topTags.map((t) => (
                    <span key={t.tag} className="rounded bg-beige-100 px-2 py-0.5 text-[10px] font-medium text-beige-700">
                      {t.tag} ({t.count})
                    </span>
                  ))}
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {/* ─── Follow-up Drawer / Modal ─── */}
      {selectedFeedback && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4 backdrop-blur-xs">
          <div className="w-full max-w-lg rounded-2xl border border-beige-200 bg-white p-6 shadow-xl space-y-5 animate-in fade-in zoom-in-95">
            <div className="flex items-center justify-between border-b border-beige-100 pb-3">
              <div>
                <h2 className="font-serif text-lg font-bold text-beige-800">Feedback Follow-up</h2>
                <p className="text-xs text-beige-500">Visit #{selectedFeedback.booking.id.slice(-6)}</p>
              </div>
              <button
                type="button"
                onClick={() => setSelectedFeedback(null)}
                className="text-beige-400 hover:text-beige-600 text-lg p-1"
              >
                ✕
              </button>
            </div>

            {saveSuccess && (
              <div className="rounded-lg bg-emerald-50 p-2.5 text-xs text-emerald-700 font-medium border border-emerald-200">
                Changes saved successfully.
              </div>
            )}

            {/* Customer & Overall Rating */}
            <div className="rounded-lg bg-beige-50/60 p-3.5 space-y-1 text-xs">
              <p className="font-semibold text-beige-800">
                {selectedFeedback.user?.name || selectedFeedback.booking.name} (★ {selectedFeedback.overallRating}/5)
              </p>
              {selectedFeedback.overallComment && (
                <p className="italic text-beige-600">&ldquo;{selectedFeedback.overallComment}&rdquo;</p>
              )}
            </div>

            {/* Status Selector */}
            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-beige-600 mb-1.5">
                Workflow Status
              </label>
              <select
                value={drawerStatus}
                onChange={(e) => setDrawerStatus(e.target.value)}
                className="w-full rounded-lg border border-beige-300 p-2 text-xs font-medium focus:border-[#C97B5C] focus:outline-none"
              >
                <option value="NEW">New (Requires initial review)</option>
                <option value="REVIEWED">Reviewed (Internal acknowledgment)</option>
                <option value="FOLLOW_UP">Follow-up (Customer contact in progress)</option>
                <option value="RESOLVED">Resolved (Case closed)</option>
              </select>
            </div>

            {/* Admin Private Notes */}
            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-beige-600 mb-1.5">
                Private Admin Notes (Never visible to customer or employees)
              </label>
              <textarea
                rows={4}
                value={drawerNotes}
                onChange={(e) => setDrawerNotes(e.target.value)}
                placeholder="Log internal follow-up steps, phone call outcomes, customer recovery measures..."
                className="w-full rounded-lg border border-beige-300 p-3 text-xs focus:border-[#C97B5C] focus:outline-none"
              />
            </div>

            <div className="flex items-center justify-end gap-2 pt-2 border-t border-beige-100">
              <button
                type="button"
                onClick={() => setSelectedFeedback(null)}
                className="rounded-lg border border-beige-300 px-4 py-2 text-xs font-semibold text-beige-700 hover:bg-beige-50"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={savingDrawer}
                onClick={handleSaveDrawer}
                className="rounded-lg bg-[#C97B5C] px-5 py-2 text-xs font-semibold text-white hover:bg-[#b56b4f] disabled:opacity-50"
              >
                {savingDrawer ? "Saving..." : "Save Changes"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
