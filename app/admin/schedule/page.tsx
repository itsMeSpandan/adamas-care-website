"use client";

import { useState, useEffect, useMemo, useCallback } from "react";
import Image from "next/image";
import { DayPicker } from "react-day-picker";
import "react-day-picker/style.css";
import { cn, displayTime } from "@/lib/utils";

const DAYS = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"];

interface Employee {
  id: string;
  name: string;
  role: string;
  imageUrl: string;
  serviceIds: string[];
}

interface Service {
  id: string;
  name: string;
  category: string;
}

interface AvailabilityRow {
  id: string;
  employeeId: string;
  dayOfWeek: number;
  startTime: string;
  endTime: string;
  isActive: boolean;
}

interface OverrideRow {
  id: string;
  employeeId: string;
  overrideDate: string;
  startTime: string | null;
  endTime: string | null;
  isBlocked: boolean;
  note: string | null;
}

interface BookingRow {
  id: string;
  employeeId: string;
  date: string;
  timeSlot: string;
  slotStart: string | null;
  slotEnd: string | null;
  name: string;
  status: string;
  price: number;
  service: Service;
  employee: Employee;
}

type TabKey = "weekly" | "overrides" | "gantt" | "bookings";

const CATEGORY_COLORS: Record<string, { bg: string; text: string; border: string }> = {
  Hair: { bg: "bg-beige-200", text: "text-beige-800", border: "border-beige-300" },
  Skin: { bg: "bg-amber-100", text: "text-amber-800", border: "border-amber-200" },
  Nails: { bg: "bg-rose-100", text: "text-rose-800", border: "border-rose-200" },
  Body: { bg: "bg-green-100", text: "text-green-800", border: "border-green-200" },
  Bridal: { bg: "bg-purple-100", text: "text-purple-800", border: "border-purple-200" },
};

const STATUS_COLORS: Record<string, { bg: string; text: string; border: string }> = {
  confirmed: { bg: "bg-emerald-50", text: "text-emerald-700", border: "border-emerald-200" },
  pending: { bg: "bg-amber-50", text: "text-amber-700", border: "border-amber-200" },
  completed: { bg: "bg-beige-50", text: "text-beige-600", border: "border-beige-200" },
  cancelled: { bg: "bg-red-50", text: "text-red-500", border: "border-red-200" },
};

function timeToMinutes(time: string): number {
  const [h, m] = time.split(":").map(Number);
  return h * 60 + m;
}

function getMonday(d: Date): Date {
  const date = new Date(d);
  const day = date.getDay();
  const diff = day === 0 ? -6 : 1 - day;
  date.setDate(date.getDate() + diff);
  date.setHours(0, 0, 0, 0);
  return date;
}

function formatDateKey(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

/** Parse ISO date string to YYYY-MM-DD using local timezone (matches formatDateKey) */
function parseLocalDateKey(iso: string): string {
  const d = new Date(iso);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

export default function ScheduleManagementPage() {
  const [activeTab, setActiveTab] = useState<TabKey>("weekly");
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [selectedEmployeeId, setSelectedEmployeeId] = useState("");
  const [availability, setAvailability] = useState<AvailabilityRow[]>([]);
  const [overrides, setOverrides] = useState<OverrideRow[]>([]);
  const [bookings, setBookings] = useState<BookingRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedDate, setSelectedDate] = useState<Date | undefined>(undefined);

  // Inline form state for adding availability
  const [addingDay, setAddingDay] = useState<number | null>(null);
  const [newStart, setNewStart] = useState("09:00");
  const [newEnd, setNewEnd] = useState("17:00");

  // Inline form state for adding override
  const [addingOverride, setAddingOverride] = useState(false);
  const [overrideForm, setOverrideForm] = useState({
    isBlocked: true,
    startTime: "09:00",
    endTime: "17:00",
    note: "",
  });

  // Edit state
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editStart, setEditStart] = useState("");
  const [editEnd, setEditEnd] = useState("");

  // Week navigation
  const [currentWeekStart, setCurrentWeekStart] = useState(() => getMonday(new Date()));

  // Popover state for booking details (fixed-position, escapes overflow containers)
  const [popover, setPopover] = useState<{
    cellKey: string;
    bookings: BookingRow[];
    date: Date;
    empName: string;
    rect: { top: number; left: number; width: number; height: number };
  } | null>(null);

  const weekDays = useMemo(() => {
    return Array.from({ length: 7 }, (_, i) => {
      const date = new Date(currentWeekStart);
      date.setDate(date.getDate() + i);
      return date;
    });
  }, [currentWeekStart]);

  // ── Data fetching ──────────────────────────────────────────

  // Fetch employees
  useEffect(() => {
    fetch("/api/employees")
      .then((res) => res.json())
      .then((data) => {
        const emps = Array.isArray(data) ? data : data.employees || data || [];
        setEmployees(emps);
        if (emps.length > 0 && !selectedEmployeeId) {
          setSelectedEmployeeId(emps[0].id);
        }
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // Fetch ALL availability (for Gantt & Bookings tabs)
  const fetchAllAvailability = useCallback(async (emps: Employee[]) => {
    try {
      const results = await Promise.all(
        emps.map((e) =>
          fetch(`/api/admin/availability?employeeId=${e.id}`).then((r) =>
            r.ok ? r.json() : { availability: [] }
          )
        )
      );
      const all: AvailabilityRow[] = [];
      for (const r of results) all.push(...(r.availability || []));
      setAvailability(all);
    } catch {}
  }, []);

  // Fetch availability for selected employee only (weekly tab)
  const fetchAvailability = useCallback(async (empId: string) => {
    if (!empId) return;
    try {
      const res = await fetch(`/api/admin/availability?employeeId=${empId}`);
      if (res.ok) {
        const data = await res.json();
        setAvailability(data.availability || []);
      }
    } catch {}
  }, []);

  const fetchOverrides = useCallback(async (empId: string) => {
    if (!empId) return;
    try {
      const res = await fetch(`/api/admin/availability/overrides?employeeId=${empId}`);
      if (res.ok) {
        const data = await res.json();
        setOverrides(data.overrides || []);
      }
    } catch {}
  }, []);

  const fetchBookings = useCallback(async () => {
    try {
      const res = await fetch("/api/bookings");
      if (res.ok) {
        const data = await res.json();
        setBookings(data.bookings || []);
      }
    } catch {}
  }, []);

  // When tab or employees change, fetch the right data
  useEffect(() => {
    if (employees.length === 0) return;

    if (activeTab === "gantt" || activeTab === "bookings") {
      fetchAllAvailability(employees);
      fetchBookings();
    } else if (activeTab === "weekly" && selectedEmployeeId) {
      fetchAvailability(selectedEmployeeId);
    } else if (activeTab === "overrides" && selectedEmployeeId) {
      fetchOverrides(selectedEmployeeId);
    }
  }, [activeTab, selectedEmployeeId, employees, fetchAllAvailability, fetchAvailability, fetchOverrides, fetchBookings]);

  const selectedEmployee = employees.find((e) => e.id === selectedEmployeeId);

  // ── Derived data ───────────────────────────────────────────

  // Group availability by day — filter by selected employee for weekly/overrides tabs
  const groupedAvailability = useMemo(() => {
    const map: Record<number, AvailabilityRow[]> = {};
    for (let i = 0; i < 7; i++) map[i] = [];
    const filtered =
      activeTab === "gantt" || activeTab === "bookings"
        ? availability
        : availability.filter((a) => a.employeeId === selectedEmployeeId);
    for (const a of filtered) {
      map[a.dayOfWeek]?.push(a);
    }
    return map;
  }, [availability, activeTab, selectedEmployeeId]);

  // Overrides for selected date
  const selectedDateOverrides = useMemo(() => {
    if (!selectedDate) return [];
    const dateKey = formatDateKey(selectedDate);
    return overrides.filter((o) => parseLocalDateKey(o.overrideDate) === dateKey);
  }, [overrides, selectedDate]);

  // Gantt & Bookings week bookings
  const weekBookings = useMemo(() => {
    // Build week boundaries as UTC dates (bookings.date is stored as UTC ISO)
    const weekStartUTC = new Date(Date.UTC(
      currentWeekStart.getFullYear(), currentWeekStart.getMonth(), currentWeekStart.getDate(), 0, 0, 0, 0
    ));
    const weekEndUTC = new Date(Date.UTC(
      currentWeekStart.getFullYear(), currentWeekStart.getMonth(), currentWeekStart.getDate() + 6, 23, 59, 59, 999
    ));

    return bookings.filter((b) => {
      if (b.status === "cancelled") return false;
      const bDate = new Date(b.date);
      return bDate >= weekStartUTC && bDate <= weekEndUTC;
    });
  }, [bookings, currentWeekStart]);

  // ── Handlers ───────────────────────────────────────────────

  async function handleAddAvailability(dayOfWeek: number) {
    if (!selectedEmployeeId) return;
    try {
      const res = await fetch("/api/admin/availability", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          employeeId: selectedEmployeeId,
          dayOfWeek,
          startTime: newStart,
          endTime: newEnd,
        }),
      });
      if (res.ok) {
        fetchAvailability(selectedEmployeeId);
        setAddingDay(null);
      } else {
        const data = await res.json();
        alert(data.error || "Failed to add availability");
      }
    } catch {}
  }

  async function handleToggleActive(id: string, currentActive: boolean) {
    try {
      await fetch(`/api/admin/availability?id=${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ isActive: !currentActive }),
      });
      fetchAvailability(selectedEmployeeId);
    } catch {}
  }

  async function handleDeleteAvailability(id: string) {
    try {
      await fetch(`/api/admin/availability?id=${id}`, { method: "DELETE" });
      fetchAvailability(selectedEmployeeId);
    } catch {}
  }

  async function handleSaveEdit(id: string) {
    try {
      await fetch(`/api/admin/availability?id=${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ startTime: editStart, endTime: editEnd }),
      });
      setEditingId(null);
      fetchAvailability(selectedEmployeeId);
    } catch {}
  }

  async function handleAddOverride() {
    if (!selectedEmployeeId || !selectedDate) return;
    try {
      const res = await fetch("/api/admin/availability/overrides", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          employeeId: selectedEmployeeId,
          overrideDate: selectedDate.toISOString(),
          startTime: overrideForm.startTime,
          endTime: overrideForm.endTime,
          isBlocked: overrideForm.isBlocked,
          note: overrideForm.note || null,
        }),
      });
      if (res.ok) {
        fetchOverrides(selectedEmployeeId);
        setAddingOverride(false);
        setOverrideForm({ isBlocked: true, startTime: "09:00", endTime: "17:00", note: "" });
      }
    } catch {}
  }

  async function handleDeleteOverride(id: string) {
    try {
      await fetch(`/api/admin/availability/overrides?id=${id}`, { method: "DELETE" });
      fetchOverrides(selectedEmployeeId);
    } catch {}
  }

  function prevWeek() {
    const d = new Date(currentWeekStart);
    d.setDate(d.getDate() - 7);
    setCurrentWeekStart(d);
    setPopover(null);
  }

  function nextWeek() {
    const d = new Date(currentWeekStart);
    d.setDate(d.getDate() + 7);
    setCurrentWeekStart(d);
    setPopover(null);
  }

  const ganttEmployees = employees;

  // Close popover on click-outside, Escape, or scroll
  useEffect(() => {
    if (!popover) return;
    function close() { setPopover(null); }
    function handleClick(e: MouseEvent) {
      const target = e.target as HTMLElement;
      if (target.closest("[data-popover-panel]")) return;
      if (target.closest("[data-popover-cell]")) return;
      close();
    }
    function handleKey(e: KeyboardEvent) {
      if (e.key === "Escape") close();
    }
    function handleScroll() { close(); }
    document.addEventListener("mousedown", handleClick);
    document.addEventListener("keydown", handleKey);
    window.addEventListener("scroll", handleScroll, true);
    document.addEventListener("scroll", handleScroll, true);
    return () => {
      document.removeEventListener("mousedown", handleClick);
      document.removeEventListener("keydown", handleKey);
      window.removeEventListener("scroll", handleScroll, true);
      document.removeEventListener("scroll", handleScroll, true);
    };
  }, [popover]);

  // ── Booking detail modal ───────────────────────────────────

  const [selectedBooking, setSelectedBooking] = useState<BookingRow | null>(null);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-beige-300 border-t-beige-600" />
      </div>
    );
  }

  return (
    <div className="space-y-8">
      {/* Header */}
      <div>
        <h1 className="font-serif text-3xl font-semibold text-beige-700">
          Schedule Management
        </h1>
        <p className="mt-1 text-beige-600">
          Manage employee availability, overrides, and view the weekly schedule.
        </p>
      </div>

      {/* Employee selector — only for weekly & overrides tabs */}
      {(activeTab === "weekly" || activeTab === "overrides") && (
        <div className="rounded-card border border-beige-200 bg-white p-4 shadow-card">
          <label className="text-sm font-medium text-beige-700">Employee</label>
          <select
            value={selectedEmployeeId}
            onChange={(e) => setSelectedEmployeeId(e.target.value)}
            className="mt-2 w-full max-w-xs rounded-xl border border-beige-300 bg-beige-50 px-4 py-2 text-sm text-beige-800 focus:border-beige-500 focus:bg-white focus:outline-none focus:ring-2 focus:ring-beige-200"
          >
            {employees.map((emp) => (
              <option key={emp.id} value={emp.id}>{emp.name}</option>
            ))}
          </select>
        </div>
      )}

      {/* Tabs */}
      <div className="flex gap-1 rounded-xl border border-beige-200 bg-beige-50 p-1">
        {([
          { key: "weekly" as TabKey, label: "Weekly Availability" },
          { key: "overrides" as TabKey, label: "Date Overrides" },
          { key: "gantt" as TabKey, label: "All Staff View" },
          { key: "bookings" as TabKey, label: "Weekly Bookings" },
        ]).map((tab) => (
          <button
            key={tab.key}
            onClick={() => setActiveTab(tab.key)}
            className={cn(
              "flex-1 rounded-lg px-4 py-2.5 text-sm font-medium transition-all",
              activeTab === tab.key
                ? "bg-white text-beige-700 shadow-sm"
                : "text-beige-500 hover:text-beige-700"
            )}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* ═══════════════════════════════════════════════════════
          Tab 1: Weekly Availability
          ═══════════════════════════════════════════════════════ */}
      {activeTab === "weekly" && (
        <div className="rounded-card border border-beige-200 bg-white shadow-card overflow-hidden">
          <div className="grid grid-cols-7 gap-px bg-beige-100">
            {DAYS.map((day, dayIdx) => (
              <div key={day} className="bg-white min-h-[250px]">
                <div className="px-3 py-2.5 text-center bg-beige-50">
                  <p className="text-xs font-semibold uppercase tracking-wider text-beige-600">
                    {day.slice(0, 3)}
                  </p>
                </div>
                <div className="p-2 space-y-2">
                  {groupedAvailability[dayIdx].map((a) => (
                    <div key={a.id} className="rounded-lg border border-beige-200 bg-beige-50 p-2.5">
                      {editingId === a.id ? (
                        <div className="space-y-1.5">
                          <input type="time" value={editStart} onChange={(e) => setEditStart(e.target.value)} className="w-full rounded border border-beige-300 px-2 py-1 text-xs" />
                          <input type="time" value={editEnd} onChange={(e) => setEditEnd(e.target.value)} className="w-full rounded border border-beige-300 px-2 py-1 text-xs" />
                          <div className="flex gap-1">
                            <button onClick={() => handleSaveEdit(a.id)} className="flex-1 rounded bg-beige-600 px-2 py-1 text-[10px] font-medium text-white">Save</button>
                            <button onClick={() => setEditingId(null)} className="flex-1 rounded border border-beige-300 px-2 py-1 text-[10px] font-medium text-beige-600">Cancel</button>
                          </div>
                        </div>
                      ) : (
                        <>
                          <p className="text-xs font-medium text-beige-700">{a.startTime} – {a.endTime}</p>
                          <div className="mt-1.5 flex items-center justify-between">
                            <button onClick={() => handleToggleActive(a.id, a.isActive)} className={cn("rounded-full px-2 py-0.5 text-[10px] font-medium", a.isActive ? "bg-emerald-100 text-emerald-700" : "bg-beige-200 text-beige-500")}>
                              {a.isActive ? "Active ✓" : "Inactive"}
                            </button>
                            <div className="flex gap-1">
                              <button onClick={() => { setEditingId(a.id); setEditStart(a.startTime); setEditEnd(a.endTime); }} className="rounded p-1 text-beige-400 hover:bg-beige-100 hover:text-beige-600">
                                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" /><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" /></svg>
                              </button>
                              <button onClick={() => handleDeleteAvailability(a.id)} className="rounded p-1 text-beige-400 hover:bg-red-50 hover:text-red-500">
                                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" /></svg>
                              </button>
                            </div>
                          </div>
                        </>
                      )}
                    </div>
                  ))}
                  {addingDay === dayIdx ? (
                    <div className="rounded-lg border border-beige-300 bg-white p-2.5 space-y-1.5">
                      <input type="time" value={newStart} onChange={(e) => setNewStart(e.target.value)} className="w-full rounded border border-beige-300 px-2 py-1 text-xs" />
                      <input type="time" value={newEnd} onChange={(e) => setNewEnd(e.target.value)} className="w-full rounded border border-beige-300 px-2 py-1 text-xs" />
                      <div className="flex gap-1">
                        <button onClick={() => handleAddAvailability(dayIdx)} className="flex-1 rounded bg-beige-600 px-2 py-1 text-[10px] font-medium text-white">Save</button>
                        <button onClick={() => setAddingDay(null)} className="flex-1 rounded border border-beige-300 px-2 py-1 text-[10px] font-medium text-beige-600">Cancel</button>
                      </div>
                    </div>
                  ) : (
                    <button onClick={() => setAddingDay(dayIdx)} className="w-full rounded-lg border border-dashed border-beige-300 px-2 py-1.5 text-[10px] font-medium text-beige-400 transition-colors hover:border-beige-400 hover:text-beige-600">+ Add slot</button>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ═══════════════════════════════════════════════════════
          Tab 2: Date Overrides
          ═══════════════════════════════════════════════════════ */}
      {activeTab === "overrides" && (
        <div className="grid gap-6 lg:grid-cols-2">
          <div className="rounded-card border border-beige-200 bg-white p-4 shadow-card">
            <DayPicker
              mode="single"
              selected={selectedDate}
              onSelect={(date) => { setSelectedDate(date ?? undefined); setAddingOverride(false); }}
              disabled={{ before: new Date() }}
              classNames={{
                month_caption: "text-beige-700 font-serif font-semibold",
                weekday: "text-beige-500 font-medium text-sm",
                day: "text-beige-800",
                day_button: "hover:bg-beige-100 rounded-lg w-9 h-9",
                selected: "!bg-beige-600 !text-white hover:!bg-beige-700",
                today: "!font-bold !text-beige-600",
              }}
            />
          </div>
          <div className="rounded-card border border-beige-200 bg-white p-6 shadow-card">
            {selectedDate ? (
              <>
                <h3 className="font-serif text-lg font-semibold text-beige-700 mb-4">
                  {selectedDate.toLocaleDateString("en-US", { weekday: "long", month: "long", day: "numeric", year: "numeric" })}
                </h3>
                {selectedEmployee && (
                  <div className="mb-4">
                    <p className="text-sm font-medium text-beige-600 mb-2">{selectedEmployee.name}&apos;s normal window:</p>
                    {(() => {
                      const jsDay = selectedDate.getDay();
                      const dbDay = jsDay === 0 ? 6 : jsDay - 1;
                      const dayAvail = groupedAvailability[dbDay];
                      if (dayAvail.length === 0) return <p className="text-sm text-beige-400 italic">Not scheduled</p>;
                      return dayAvail.map((a) => (
                        <div key={a.id} className="rounded-lg bg-beige-50 border border-beige-200 px-3 py-2 text-sm text-beige-700">
                          {a.startTime} – {a.endTime}
                          {!a.isActive && <span className="ml-2 text-xs text-beige-400">(inactive)</span>}
                        </div>
                      ));
                    })()}
                  </div>
                )}
                {selectedDateOverrides.length > 0 && (
                  <div className="mb-4 space-y-2">
                    <p className="text-sm font-medium text-beige-600">Overrides:</p>
                    {selectedDateOverrides.map((o) => (
                      <div key={o.id} className="flex items-center justify-between rounded-lg border border-beige-200 px-3 py-2">
                        <div>
                          <span className={cn("inline-block rounded-full px-2 py-0.5 text-[10px] font-medium mr-2", o.isBlocked ? "bg-red-100 text-red-700" : "bg-emerald-100 text-emerald-700")}>
                            {o.isBlocked ? "Blocked" : "Extra"}
                          </span>
                          <span className="text-sm text-beige-700">
                            {o.startTime && o.endTime ? `${o.startTime} – ${o.endTime}` : "Full day"}
                          </span>
                          {o.note && <span className="ml-2 text-xs text-beige-400">({o.note})</span>}
                        </div>
                        <button onClick={() => handleDeleteOverride(o.id)} className="rounded p-1 text-beige-400 hover:bg-red-50 hover:text-red-500">
                          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" /></svg>
                        </button>
                      </div>
                    ))}
                  </div>
                )}
                {addingOverride ? (
                  <div className="rounded-lg border border-beige-300 bg-beige-50 p-4 space-y-3">
                    <div className="flex gap-4">
                      <label className="flex items-center gap-2 text-sm">
                        <input type="radio" checked={overrideForm.isBlocked} onChange={() => setOverrideForm({ ...overrideForm, isBlocked: true })} className="accent-red-500" /> Block
                      </label>
                      <label className="flex items-center gap-2 text-sm">
                        <input type="radio" checked={!overrideForm.isBlocked} onChange={() => setOverrideForm({ ...overrideForm, isBlocked: false })} className="accent-emerald-500" /> Extra window
                      </label>
                    </div>
                    <div className="grid grid-cols-2 gap-3">
                      <div><label className="text-xs text-beige-500">Start</label><input type="time" value={overrideForm.startTime} onChange={(e) => setOverrideForm({ ...overrideForm, startTime: e.target.value })} className="w-full rounded border border-beige-300 px-2 py-1.5 text-sm" /></div>
                      <div><label className="text-xs text-beige-500">End</label><input type="time" value={overrideForm.endTime} onChange={(e) => setOverrideForm({ ...overrideForm, endTime: e.target.value })} className="w-full rounded border border-beige-300 px-2 py-1.5 text-sm" /></div>
                    </div>
                    <input type="text" placeholder="Note (optional)" value={overrideForm.note} onChange={(e) => setOverrideForm({ ...overrideForm, note: e.target.value })} className="w-full rounded border border-beige-300 px-3 py-1.5 text-sm" />
                    <div className="flex gap-2">
                      <button onClick={handleAddOverride} className="rounded-lg bg-beige-600 px-4 py-1.5 text-sm font-medium text-white">Save</button>
                      <button onClick={() => setAddingOverride(false)} className="rounded-lg border border-beige-300 px-4 py-1.5 text-sm font-medium text-beige-600">Cancel</button>
                    </div>
                  </div>
                ) : (
                  <button onClick={() => setAddingOverride(true)} className="rounded-lg border border-dashed border-beige-300 px-4 py-2 text-sm font-medium text-beige-400 transition-colors hover:border-beige-400 hover:text-beige-600">+ Add override</button>
                )}
              </>
            ) : (
              <div className="flex h-full items-center justify-center py-12"><p className="text-beige-400">Select a date to manage overrides</p></div>
            )}
          </div>
        </div>
      )}

      {/* ═══════════════════════════════════════════════════════
          Tab 3: All Staff Gantt View
          ═══════════════════════════════════════════════════════ */}
      {activeTab === "gantt" && (
        <div className="rounded-card border border-beige-200 bg-white shadow-card overflow-x-auto">
          <div className="flex items-center justify-between border-b border-beige-100 px-6 py-4">
            <div className="flex items-center gap-3">
              <button onClick={prevWeek} className="flex h-9 w-9 items-center justify-center rounded-lg border border-beige-300 text-beige-600 transition-colors hover:bg-beige-50">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="15 18 9 12 15 6" /></svg>
              </button>
              <p className="text-sm font-semibold text-beige-700">
                {weekDays[0].toLocaleDateString("en-US", { month: "long", day: "numeric" })} – {weekDays[6].toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric" })}
              </p>
              <button onClick={nextWeek} className="flex h-9 w-9 items-center justify-center rounded-lg border border-beige-300 text-beige-600 transition-colors hover:bg-beige-50">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="9 18 15 12 9 6" /></svg>
              </button>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-xs text-beige-400">{availability.length} availability windows · {weekBookings.length} bookings</span>
            </div>
          </div>

          <div className="overflow-x-auto">
            <div className="min-w-[800px]">
              {/* Day headers */}
              <div className="grid grid-cols-[160px_repeat(7,1fr)] border-b border-beige-100">
                <div className="px-4 py-2 bg-beige-50" />
                {DAYS.map((day, idx) => {
                  const date = weekDays[idx];
                  const isToday = formatDateKey(new Date()) === formatDateKey(date);
                  return (
                    <div key={day} className={cn("px-2 py-2 text-center", isToday ? "bg-beige-600" : "bg-beige-50")}>
                      <p className={cn("text-[10px] font-semibold uppercase", isToday ? "text-white" : "text-beige-600")}>{day.slice(0, 3)}</p>
                      <p className={cn("text-xs font-bold", isToday ? "text-white" : "text-beige-800")}>{date.getDate()}</p>
                    </div>
                  );
                })}
              </div>

              {/* Employee rows */}
              {ganttEmployees.map((emp) => (
                <div key={emp.id} className="grid grid-cols-[160px_repeat(7,1fr)] border-b border-beige-100">
                  <div className="flex items-center gap-2 px-4 py-3 bg-beige-50/50">
                    <div className="relative h-7 w-7 flex-shrink-0 overflow-hidden rounded-full">
                      <Image src={emp.imageUrl} alt={emp.name} fill className="object-cover" sizes="28px" />
                    </div>
                    <div className="min-w-0">
                      <p className="text-xs font-semibold text-beige-700 truncate">{emp.name}</p>
                      <p className="text-[10px] text-beige-400 truncate">{emp.role}</p>
                    </div>
                  </div>

                  {weekDays.map((date, dayIdx) => {
                    const jsDay = date.getDay();
                    const dbDay = jsDay === 0 ? 6 : jsDay - 1;
                    const dateKey = formatDateKey(date);

                    const empAvail = availability.filter(
                      (a) => a.employeeId === emp.id && a.dayOfWeek === dbDay && a.isActive
                    );

                    const empBookings = weekBookings
                      .filter((b) => b.employeeId === emp.id && parseLocalDateKey(b.date) === dateKey)
                      .sort((a, b) => timeToMinutes(a.slotStart || a.timeSlot) - timeToMinutes(b.slotStart || b.timeSlot));

                    const isAvailable = empAvail.length > 0;
                    const bookingCount = empBookings.length;
                    const cellKey = `${emp.id}-${dateKey}`;

                    return (
                      <div
                        key={dayIdx}
                        className={cn(
                          "relative min-h-[60px] border-l border-beige-100 cursor-default",
                          isAvailable && "bg-beige-50"
                        )}
                      >
                        {/* Availability band — full-width background stripe */}
                        {isAvailable && (
                          <div className="absolute inset-x-0 top-1 bottom-1 rounded bg-beige-100/60" />
                        )}

                        {/* Summary badge — click opens fixed popover */}
                        {bookingCount > 0 && (
                          <div className="absolute inset-0 flex items-center justify-center z-10">
                            <button
                              data-popover-cell={cellKey}
                              className="inline-flex items-center justify-center rounded-full bg-beige-600 px-2.5 py-0.5 text-[11px] font-semibold text-white shadow-sm transition-transform hover:scale-110 active:scale-95"
                              onClick={(e) => {
                                const rect = (e.currentTarget as HTMLElement).getBoundingClientRect();
                                if (popover?.cellKey === cellKey) {
                                  setPopover(null);
                                } else {
                                  setPopover({
                                    cellKey,
                                    bookings: empBookings,
                                    date,
                                    empName: emp.name,
                                    rect: { top: rect.top, left: rect.left, width: rect.width, height: rect.height },
                                  });
                                }
                              }}
                            >
                              {bookingCount}
                            </button>
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* ═══════════════════════════════════════════════════════
          Tab 4: Weekly Bookings
          ═══════════════════════════════════════════════════════ */}
      {activeTab === "bookings" && (
        <div className="rounded-card border border-beige-200 bg-white shadow-card overflow-hidden">
          {/* Week navigation */}
          <div className="flex items-center justify-between border-b border-beige-100 px-6 py-4">
            <div className="flex items-center gap-3">
              <button onClick={prevWeek} className="flex h-9 w-9 items-center justify-center rounded-lg border border-beige-300 text-beige-600 transition-colors hover:bg-beige-50">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="15 18 9 12 15 6" /></svg>
              </button>
              <p className="text-sm font-semibold text-beige-700">
                {weekDays[0].toLocaleDateString("en-US", { month: "long", day: "numeric" })} – {weekDays[6].toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric" })}
              </p>
              <button onClick={nextWeek} className="flex h-9 w-9 items-center justify-center rounded-lg border border-beige-300 text-beige-600 transition-colors hover:bg-beige-50">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="9 18 15 12 9 6" /></svg>
              </button>
            </div>
            <span className="text-xs text-beige-400">{weekBookings.length} booking{weekBookings.length !== 1 ? "s" : ""}</span>
          </div>

          {/* Desktop weekly grid */}
          <div className="hidden md:block overflow-x-auto">
            <div className="grid grid-cols-7 gap-px bg-beige-100">
              {DAYS.map((day, dayIdx) => {
                const date = weekDays[dayIdx];
                const dateKey = formatDateKey(date);
                const isToday = formatDateKey(new Date()) === dateKey;
                const dayBookings = weekBookings.filter((b) => parseLocalDateKey(b.date) === dateKey)
                  .sort((a, b) => timeToMinutes(a.slotStart || a.timeSlot) - timeToMinutes(b.slotStart || b.timeSlot));

                return (
                  <div key={day} className="bg-white min-h-[200px]">
                    <div className={cn("px-3 py-2.5 text-center", isToday ? "bg-beige-600" : "bg-beige-50")}>
                      <p className={cn("text-xs font-semibold uppercase tracking-wider", isToday ? "text-white" : "text-beige-600")}>
                        {day.slice(0, 3)}
                      </p>
                      <p className={cn("text-sm font-bold", isToday ? "text-white" : "text-beige-800")}>
                        {date.getDate()}
                      </p>
                    </div>
                    <div className="space-y-1 p-2">
                      {dayBookings.length > 0 ? (
                        dayBookings.map((booking) => {
                          const cat = booking.service?.category || "Hair";
                          const colors = CATEGORY_COLORS[cat] || CATEGORY_COLORS.Hair;
                          const statusColors = STATUS_COLORS[booking.status] || STATUS_COLORS.pending;
                          return (
                            <button
                              key={booking.id}
                              onClick={() => setSelectedBooking(booking)}
                              className={cn("w-full text-left rounded-lg border p-2 transition-colors hover:shadow-sm cursor-pointer", colors.bg, colors.border)}
                            >
                              <p className={cn("text-[10px] font-medium leading-tight truncate", colors.text)}>
                                {booking.slotStart || booking.timeSlot}
                              </p>
                              <p className={cn("text-[10px] font-medium truncate mt-0.5", colors.text)}>
                                {booking.name}
                              </p>
                              <p className={cn("text-[9px] truncate", colors.text, "opacity-70")}>
                                {booking.service?.name}
                              </p>
                              <span className={cn("inline-block mt-1 rounded-full px-1.5 py-0.5 text-[8px] font-medium", statusColors.bg, statusColors.text)}>
                                {booking.status}
                              </span>
                            </button>
                          );
                        })
                      ) : (
                        <div className="flex h-full min-h-[80px] items-center justify-center">
                          <p className="text-[10px] text-beige-300">No bookings</p>
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Mobile list */}
          <div className="md:hidden divide-y divide-beige-100">
            {DAYS.map((day, dayIdx) => {
              const date = weekDays[dayIdx];
              const dateKey = formatDateKey(date);
              const isToday = formatDateKey(new Date()) === dateKey;
              const dayBookings = weekBookings.filter((b) => parseLocalDateKey(b.date) === dateKey)
                .sort((a, b) => timeToMinutes(a.slotStart || a.timeSlot) - timeToMinutes(b.slotStart || b.timeSlot));

              return (
                <div key={day}>
                  <div className={cn("px-4 py-3", isToday ? "bg-beige-600" : "bg-beige-50")}>
                    <p className={cn("text-xs font-semibold uppercase tracking-wider", isToday ? "text-white" : "text-beige-600")}>
                      {day} — {date.toLocaleDateString("en-US", { month: "short", day: "numeric" })}
                    </p>
                  </div>
                  <div className="p-2 space-y-1.5">
                    {dayBookings.length > 0 ? (
                      dayBookings.map((booking) => {
                        const cat = booking.service?.category || "Hair";
                        const colors = CATEGORY_COLORS[cat] || CATEGORY_COLORS.Hair;
                        const statusColors = STATUS_COLORS[booking.status] || STATUS_COLORS.pending;
                        return (
                          <button
                            key={booking.id}
                            onClick={() => setSelectedBooking(booking)}
                            className={cn("w-full text-left rounded-lg border p-3 transition-colors cursor-pointer", colors.bg, colors.border)}
                          >
                            <div className="flex items-center justify-between">
                              <p className={cn("text-sm font-medium", colors.text)}>
                                {booking.name} — {booking.service?.name}
                              </p>
                              <span className={cn("rounded-full px-2 py-0.5 text-[10px] font-medium", statusColors.bg, statusColors.text)}>
                                {booking.status}
                              </span>
                            </div>
                            <p className={cn("text-xs mt-1", colors.text, "opacity-70")}>
                              {displayTime(booking.slotStart || booking.timeSlot)}
                              {booking.slotEnd ? ` – ${displayTime(booking.slotEnd)}` : ""} · {booking.employee?.name}
                            </p>
                          </button>
                        );
                      })
                    ) : (
                      <p className="text-center text-sm text-beige-400 py-4">No bookings</p>
                    )}
                  </div>
                </div>
              );
            })}
          </div>

          {weekBookings.length === 0 && (
            <div className="px-6 py-12 text-center">
              <p className="text-beige-400">No bookings for this week.</p>
            </div>
          )}
        </div>
      )}

      {/* ═══════════════════════════════════════════════════════
          Fixed-position booking popover (escapes overflow containers)
          ═══════════════════════════════════════════════════════ */}
      {popover && (
        <div
          data-popover-panel
          className="fixed z-50 w-60 rounded-lg border border-beige-200 bg-white p-3 shadow-xl"
          style={{
            top: popover.rect.top - 8,
            left: popover.rect.left + popover.rect.width / 2,
            transform: "translate(-50%, -100%)",
          }}
        >
          <p className="mb-2 text-[11px] font-semibold uppercase tracking-wider text-beige-500">
            {popover.empName} — {popover.date.toLocaleDateString("en-US", { weekday: "short", month: "short", day: "numeric" })}
          </p>
          <div className="space-y-1.5">
            {popover.bookings.map((b) => {
              const cat = b.service?.category || "Hair";
              const colors = CATEGORY_COLORS[cat] || CATEGORY_COLORS.Hair;
              const statusColors = STATUS_COLORS[b.status] || STATUS_COLORS.pending;
              return (
                <button
                  key={b.id}
                  className="w-full text-left"
                  onClick={() => { setSelectedBooking(b); setPopover(null); }}
                >
                  <div className="flex items-center gap-2 rounded-md px-1.5 py-1.5 transition-colors hover:bg-beige-50">
                    <span className={cn("inline-block h-2 w-2 flex-shrink-0 rounded-full border", colors.bg, colors.border)} />
                    <div className="min-w-0 flex-1">
                      <p className="text-[10px] font-medium leading-tight text-beige-700 truncate">
                        {b.slotStart || b.timeSlot}{b.slotEnd ? ` – ${b.slotEnd}` : ""}
                      </p>
                      <p className="text-[10px] font-medium leading-tight text-beige-600 truncate">
                        {b.name}
                      </p>
                      <p className={cn("text-[9px] leading-tight truncate", colors.text)}>
                        {b.service?.name}
                      </p>
                    </div>
                    <span className={cn("flex-shrink-0 rounded-full px-1 py-0.5 text-[8px] font-medium", statusColors.bg, statusColors.text)}>
                      {b.status}
                    </span>
                  </div>
                </button>
              );
            })}
          </div>
          {/* Arrow pointing down to the badge */}
          <div className="absolute left-1/2 -translate-x-1/2 top-full">
            <div className="h-0 w-0 border-l-[5px] border-r-[5px] border-t-[5px] border-l-transparent border-r-transparent border-t-beige-200" />
          </div>
        </div>
      )}

      {/* ═══════════════════════════════════════════════════════
          Booking Detail Modal
          ═══════════════════════════════════════════════════════ */}
      {selectedBooking && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-beige-900/40 p-4 backdrop-blur-sm" onClick={() => setSelectedBooking(null)}>
          <div className="w-full max-w-md overflow-hidden rounded-card border border-beige-200 bg-white shadow-xl" onClick={(e) => e.stopPropagation()}>
            <div className="border-b border-beige-100 px-6 py-4">
              <div className="flex items-center justify-between">
                <h2 className="font-serif text-lg font-semibold text-beige-700">Booking Details</h2>
                <button onClick={() => setSelectedBooking(null)} className="flex h-8 w-8 items-center justify-center rounded-full text-beige-400 transition-colors hover:bg-beige-100 hover:text-beige-600">
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="18" x2="6" y1="6" y2="18" /><line x1="6" x2="18" y1="6" y2="18" /></svg>
                </button>
              </div>
            </div>
            <div className="px-6 py-5 space-y-3">
              <div className="flex items-center gap-3">
                <div className="relative h-10 w-10 overflow-hidden rounded-full">
                  <Image src={selectedBooking.employee.imageUrl} alt={selectedBooking.employee.name} fill className="object-cover" sizes="40px" />
                </div>
                <div>
                  <p className="text-sm font-semibold text-beige-700">{selectedBooking.employee.name}</p>
                  <p className="text-xs text-beige-500">{selectedBooking.service.name}</p>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3 text-sm">
                <div><p className="text-xs text-beige-400">Client</p><p className="font-medium text-beige-700">{selectedBooking.name}</p></div>
                <div><p className="text-xs text-beige-400">Time</p><p className="font-medium text-beige-700">{selectedBooking.slotStart || selectedBooking.timeSlot}{selectedBooking.slotEnd ? ` – ${selectedBooking.slotEnd}` : ""}</p></div>
                <div><p className="text-xs text-beige-400">Date</p><p className="font-medium text-beige-700">{new Date(selectedBooking.date).toLocaleDateString("en-US", { weekday: "short", month: "short", day: "numeric" })}</p></div>
                <div><p className="text-xs text-beige-400">Price</p><p className="font-medium text-beige-700">${selectedBooking.price.toFixed(2)}</p></div>
                <div><p className="text-xs text-beige-400">Status</p>
                  <span className={cn("inline-block rounded-full px-2 py-0.5 text-xs font-medium", STATUS_COLORS[selectedBooking.status]?.bg, STATUS_COLORS[selectedBooking.status]?.text)}>
                    {selectedBooking.status}
                  </span>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
