"use client";

import { useState, useEffect, useMemo } from "react";
import Image from "next/image";
import { displayTime } from "@/lib/utils";

const DAYS = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"];

const TIME_OPTIONS = [
  "09:00", "09:30", "10:00", "10:30", "11:00", "11:30",
  "12:00", "12:30", "13:00", "13:30", "14:00", "14:30",
  "15:00", "15:30", "16:00", "16:30", "17:00", "17:30",
];

interface Employee {
  id: string;
  name: string;
  role: string;
  imageUrl: string;
}

interface Service {
  id: string;
  name: string;
  category: string;
}

interface ShiftEntry {
  id: string;
  employeeId: string;
  date: string;
  startTime: string;
  endTime: string;
  serviceId: string | null;
  employee: Employee;
  service: Service | null;
}

function formatDateKey(date: Date): string {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;
}

function parseDateKey(key: string): Date {
  const [y, m, d] = key.split("-").map(Number);
  return new Date(y, m - 1, d);
}

export default function ShiftsManagementPage() {
  const [shifts, setShifts] = useState<ShiftEntry[]>([]);
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [services, setServices] = useState<Service[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  // Calendar state
  const [currentWeekStart, setCurrentWeekStart] = useState(() => {
    const now = new Date();
    const day = now.getDay();
    const diff = day === 0 ? 6 : day - 1; // Monday-based
    const monday = new Date(now);
    monday.setDate(now.getDate() - diff);
    monday.setHours(0, 0, 0, 0);
    return monday;
  });

  // Form state
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [formEmployeeId, setFormEmployeeId] = useState("");
  const [formDate, setFormDate] = useState("");
  const [formStartTime, setFormStartTime] = useState("09:00");
  const [formEndTime, setFormEndTime] = useState("17:00");
  const [formServiceId, setFormServiceId] = useState("");
  const [formError, setFormError] = useState("");
  const [formSuccess, setFormSuccess] = useState("");
  const [savedCount, setSavedCount] = useState(0);

  // Filter state
  const [filterEmployee, setFilterEmployee] = useState("");

  useEffect(() => {
    fetchData();
  }, []);

  // Refetch when week changes
  useEffect(() => {
    if (!loading) fetchShiftsForWeek();
  }, [currentWeekStart]);

  async function fetchData() {
    try {
      const [employeesRes, servicesRes] = await Promise.all([
        fetch("/api/employees"),
        fetch("/api/services"),
      ]);

      if (employeesRes.ok) {
        const data = await employeesRes.json();
        setEmployees(data.employees || data || []);
      }
      if (servicesRes.ok) {
        const data = await servicesRes.json();
        setServices(data.services || data || []);
      }
    } catch {
      // silently fail
    } finally {
      setLoading(false);
    }
  }

  async function fetchShiftsForWeek() {
    try {
      const endDate = new Date(currentWeekStart);
      endDate.setDate(endDate.getDate() + 6);

      const params = new URLSearchParams({
        startDate: formatDateKey(currentWeekStart),
        endDate: formatDateKey(endDate),
      });

      const res = await fetch(`/api/shifts?${params}`);
      if (res.ok) {
        const data = await res.json();
        setShifts(data.shifts || []);
      }
    } catch {
      // silently fail
    }
  }

  const weekDays = useMemo(() => {
    return Array.from({ length: 7 }, (_, i) => {
      const date = new Date(currentWeekStart);
      date.setDate(date.getDate() + i);
      return date;
    });
  }, [currentWeekStart]);

  // Group shifts by date
  const shiftsByDate = useMemo(() => {
    const map: Record<string, ShiftEntry[]> = {};
    for (const shift of shifts) {
      const dateKey = shift.date.split("T")[0];
      if (!map[dateKey]) map[dateKey] = [];
      map[dateKey].push(shift);
    }
    // Sort within each day by start time
    for (const key of Object.keys(map)) {
      map[key].sort((a, b) => a.startTime.localeCompare(b.startTime));
    }
    return map;
  }, [shifts]);

  const filteredShifts = filterEmployee
    ? shifts.filter((s) => s.employeeId === filterEmployee)
    : shifts;

  function resetForm() {
    setFormEmployeeId("");
    setFormDate("");
    setFormStartTime("09:00");
    setFormEndTime("17:00");
    setFormServiceId("");
    setEditingId(null);
    setFormError("");
    setFormSuccess("");
  }

  function openAddForm(date?: Date) {
    resetForm();
    if (date) {
      setFormDate(formatDateKey(date));
    } else {
      setFormDate(formatDateKey(weekDays[0]));
    }
    setShowForm(true);
  }

  function openEditForm(entry: ShiftEntry) {
    setFormEmployeeId(entry.employeeId);
    setFormDate(entry.date.split("T")[0]);
    setFormStartTime(entry.startTime);
    setFormEndTime(entry.endTime);
    setFormServiceId(entry.serviceId || "");
    setEditingId(entry.id);
    setShowForm(true);
    setFormError("");
    setFormSuccess("");
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setFormError("");
    setFormSuccess("");

    if (formStartTime >= formEndTime) {
      setFormError("End time must be after start time");
      return;
    }
    if (!formEmployeeId) {
      setFormError("Please select an employee");
      return;
    }
    if (!formDate) {
      setFormError("Please select a date");
      return;
    }

    // Client-side overlap detection
    const dateShifts = filteredShifts.filter((s) => {
      if (editingId && s.id === editingId) return false;
      if (s.employeeId !== formEmployeeId) return false;
      const sDate = s.date.split("T")[0];
      return sDate === formDate;
    });
    const conflict = dateShifts.find(
      (s) => s.startTime < formEndTime && s.endTime > formStartTime
    );
    if (conflict) {
      const emp = employees.find((e) => e.id === conflict.employeeId);
      const svc = conflict.service?.name || "General";
      setFormError(
        `Overlap with ${emp?.name || "employee"}'s shift on ${formDate} (${displayTime(conflict.startTime)} – ${displayTime(conflict.endTime)}, ${svc}). Please choose a non-overlapping time.`
      );
      return;
    }

    setSaving(true);

    try {
      const body = {
        employeeId: formEmployeeId,
        date: formDate,
        startTime: formStartTime,
        endTime: formEndTime,
        serviceId: formServiceId || null,
      };

      if (editingId) {
        const res = await fetch(`/api/shifts/${editingId}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(body),
        });

        if (!res.ok) {
          const data = await res.json();
          setFormError(data.error || "Failed to update shift");
          return;
        }

        setFormSuccess("Shift updated!");
      } else {
        const res = await fetch("/api/shifts", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(body),
        });

        if (!res.ok) {
          const data = await res.json();
          setFormError(data.error || "Failed to create shift");
          return;
        }

        setFormSuccess("Shift created!");
      }

      await fetchShiftsForWeek();
      setSavedCount((c) => c + 1);
      setTimeout(() => {
        setFormSuccess("");
        // Keep form open: clear employee but keep date & times for rapid entry
        setFormEmployeeId("");
        setEditingId(null);
        setFormError("");
      }, 600);
    } catch {
      setFormError("Failed to save shift");
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete(id: string) {
    if (!window.confirm("Delete this shift?")) return;

    try {
      const res = await fetch(`/api/shifts/${id}`, { method: "DELETE" });
      if (res.ok) {
        setShifts((prev) => prev.filter((s) => s.id !== id));
      }
    } catch {
      // silently fail
    }
  }

  function prevWeek() {
    const d = new Date(currentWeekStart);
    d.setDate(d.getDate() - 7);
    setCurrentWeekStart(d);
  }

  function nextWeek() {
    const d = new Date(currentWeekStart);
    d.setDate(d.getDate() + 7);
    setCurrentWeekStart(d);
  }

  function goToThisWeek() {
    const now = new Date();
    const day = now.getDay();
    const diff = day === 0 ? 6 : day - 1;
    const monday = new Date(now);
    monday.setDate(now.getDate() - diff);
    monday.setHours(0, 0, 0, 0);
    setCurrentWeekStart(monday);
  }

  const isCurrentWeek = useMemo(() => {
    const today = new Date();
    const day = today.getDay();
    const diff = day === 0 ? 6 : day - 1;
    const todayMonday = new Date(today.getFullYear(), today.getMonth(), today.getDate() - diff);
    return currentWeekStart.getTime() === todayMonday.getTime();
  }, [currentWeekStart]);

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="font-serif text-3xl font-semibold text-beige-700">
            Shift Management
          </h1>
          <p className="mt-1 text-beige-600">
            Assign date-specific shifts to employees. These shifts guide client slot selection.
          </p>
        </div>
        <button onClick={() => openAddForm()} className="btn-primary">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="mr-2">
            <line x1="12" x2="12" y1="5" y2="19" /><line x1="5" x2="19" y1="12" y2="12" />
          </svg>
          Add Shift
        </button>
      </div>

      {/* Week Navigator */}
      <div className="rounded-card border border-beige-200 bg-white p-4 shadow-card">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center gap-3">
            <button
              onClick={prevWeek}
              className="flex h-9 w-9 items-center justify-center rounded-lg border border-beige-300 text-beige-600 transition-colors hover:bg-beige-50"
            >
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <polyline points="15 18 9 12 15 6" />
              </svg>
            </button>
            <div className="text-center">
              <p className="text-sm font-semibold text-beige-700">
                {currentWeekStart.toLocaleDateString("en-US", { month: "long", day: "numeric" })} –{" "}
                {new Date(currentWeekStart.getTime() + 6 * 86400000).toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric" })}
              </p>
            </div>
            <button
              onClick={nextWeek}
              className="flex h-9 w-9 items-center justify-center rounded-lg border border-beige-300 text-beige-600 transition-colors hover:bg-beige-50"
            >
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <polyline points="9 18 15 12 9 6" />
              </svg>
            </button>
            {!isCurrentWeek && (
              <button
                onClick={goToThisWeek}
                className="rounded-lg border border-beige-300 px-3 py-1.5 text-xs font-medium text-beige-600 transition-colors hover:bg-beige-50"
              >
                Today
              </button>
            )}
          </div>
          <div className="flex items-center gap-4">
            <label className="text-sm font-medium text-beige-700">Filter:</label>
            <select
              value={filterEmployee}
              onChange={(e) => setFilterEmployee(e.target.value)}
              className="rounded-xl border border-beige-300 bg-beige-50 px-4 py-2 text-sm text-beige-800 focus:border-beige-500 focus:bg-white focus:outline-none focus:ring-2 focus:ring-beige-200"
            >
              <option value="">All Employees</option>
              {employees.map((emp) => (
                <option key={emp.id} value={emp.id}>{emp.name}</option>
              ))}
            </select>
            <span className="text-xs text-beige-400">
              {filteredShifts.length} shift{filteredShifts.length !== 1 ? "s" : ""}
            </span>
          </div>
        </div>
      </div>

      {/* Add/Edit Form Modal */}
      {showForm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-beige-900/40 p-4 backdrop-blur-sm" onClick={() => setShowForm(false)}>
          <div className="w-full max-w-lg overflow-hidden rounded-card border border-beige-200 bg-white shadow-xl" onClick={(e) => e.stopPropagation()}>
            <div className="border-b border-beige-100 px-6 py-4">
              <div className="flex items-center justify-between">
                <h2 className="font-serif text-lg font-semibold text-beige-700">
                  {editingId ? "Edit Shift" : "Add Shift"}
                </h2>
                <button onClick={() => { setShowForm(false); resetForm(); }} className="flex h-8 w-8 items-center justify-center rounded-full text-beige-400 transition-colors hover:bg-beige-100 hover:text-beige-600">
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <line x1="18" x2="6" y1="6" y2="18" /><line x1="6" x2="18" y1="6" y2="18" />
                  </svg>
                </button>
              </div>
            </div>

            <form onSubmit={handleSubmit} className="px-6 py-5">
              {formError && (
                <div className="mb-4 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">{formError}</div>
              )}
              {formSuccess && (
                <div className="mb-4 rounded-lg border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-700">{formSuccess}</div>
              )}

              <div className="space-y-4">
                {/* Employee */}
                <div>
                  <label className="mb-1 block text-sm font-medium text-beige-700">Employee</label>
                  <select
                    required
                    value={formEmployeeId}
                    onChange={(e) => setFormEmployeeId(e.target.value)}
                    className="w-full rounded-xl border border-beige-300 bg-beige-50 px-4 py-3 text-sm text-beige-800 focus:border-beige-500 focus:bg-white focus:outline-none focus:ring-2 focus:ring-beige-200"
                  >
                    <option value="">Select employee</option>
                    {employees.map((emp) => (
                      <option key={emp.id} value={emp.id}>{emp.name} — {emp.role}</option>
                    ))}
                  </select>
                </div>

                {/* Date */}
                <div>
                  <label className="mb-1 block text-sm font-medium text-beige-700">Date</label>
                  <input
                    type="date"
                    required
                    value={formDate}
                    onChange={(e) => setFormDate(e.target.value)}
                    className="w-full rounded-xl border border-beige-300 bg-beige-50 px-4 py-3 text-sm text-beige-800 focus:border-beige-500 focus:bg-white focus:outline-none focus:ring-2 focus:ring-beige-200"
                  />
                </div>

                {/* Times */}
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="mb-1 block text-sm font-medium text-beige-700">Start Time</label>
                    <select
                      required
                      value={formStartTime}
                      onChange={(e) => setFormStartTime(e.target.value)}
                      className="w-full rounded-xl border border-beige-300 bg-beige-50 px-4 py-3 text-sm text-beige-800 focus:border-beige-500 focus:bg-white focus:outline-none focus:ring-2 focus:ring-beige-200"
                    >
                      {TIME_OPTIONS.map((t) => (
                        <option key={t} value={t}>{displayTime(t)}</option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="mb-1 block text-sm font-medium text-beige-700">End Time</label>
                    <select
                      required
                      value={formEndTime}
                      onChange={(e) => setFormEndTime(e.target.value)}
                      className="w-full rounded-xl border border-beige-300 bg-beige-50 px-4 py-3 text-sm text-beige-800 focus:border-beige-500 focus:bg-white focus:outline-none focus:ring-2 focus:ring-beige-200"
                    >
                      {TIME_OPTIONS.map((t) => (
                        <option key={t} value={t}>{displayTime(t)}</option>
                      ))}
                    </select>
                  </div>
                </div>

                {/* Service */}
                <div>
                  <label className="mb-1 block text-sm font-medium text-beige-700">Service (optional)</label>
                  <select
                    value={formServiceId}
                    onChange={(e) => setFormServiceId(e.target.value)}
                    className="w-full rounded-xl border border-beige-300 bg-beige-50 px-4 py-3 text-sm text-beige-800 focus:border-beige-500 focus:bg-white focus:outline-none focus:ring-2 focus:ring-beige-200"
                  >
                    <option value="">General / No specific service</option>
                    {services.map((svc) => (
                      <option key={svc.id} value={svc.id}>{svc.name}</option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="mt-6 flex gap-3">
                <button type="submit" disabled={saving} className="btn-primary flex-1">
                  {saving ? "Saving..." : editingId ? "Update Shift" : "Add Shift"}
                </button>
                <button type="button" onClick={() => { setShowForm(false); resetForm(); setSavedCount(0); }} className="btn-outline">
                  Done{savedCount > 0 ? ` (${savedCount})` : ""}
                </button>
              </div>
              {savedCount > 0 && (
                <p className="mt-2 text-center text-xs text-beige-400">
                  {savedCount} shift{savedCount !== 1 ? "s" : ""} added. Pick another employee or click Done.
                </p>
              )}
            </form>
          </div>
        </div>
      )}

      {/* Weekly Grid */}
      {loading ? (
        <div className="flex items-center justify-center py-12">
          <div className="h-8 w-8 animate-spin rounded-full border-2 border-beige-300 border-t-beige-600" />
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-4 md:grid-cols-7">
          {weekDays.map((date) => {
            const dateKey = formatDateKey(date);
            const dayShifts = shiftsByDate[dateKey] || [];
            const isToday = formatDateKey(new Date()) === dateKey;

            return (
              <div
                key={dateKey}
                className={`rounded-card border bg-white shadow-card overflow-hidden ${
                  isToday ? "border-beige-500 ring-2 ring-beige-200" : "border-beige-200"
                }`}
              >
                <div className={`border-b border-beige-100 px-3 py-2.5 text-center ${isToday ? "bg-beige-600" : "bg-beige-50"}`}>
                  <p className={`text-xs font-semibold uppercase tracking-wider ${isToday ? "text-white" : "text-beige-600"}`}>
                    {DAYS[date.getDay() === 0 ? 6 : date.getDay() - 1]}
                  </p>
                  <p className={`text-sm font-bold ${isToday ? "text-white" : "text-beige-800"}`}>
                    {date.getDate()}
                  </p>
                </div>
                <div className="min-h-[140px] p-2 space-y-1.5">
                  {dayShifts.length > 0 ? (
                    dayShifts
                      .filter((s) => !filterEmployee || s.employeeId === filterEmployee)
                      .map((shift) => (
                        <div
                          key={shift.id}
                          className="group relative rounded-lg bg-beige-50 border border-beige-200 p-2 transition-colors hover:bg-beige-100"
                        >
                          <p className="text-[10px] font-medium text-beige-500 leading-tight truncate">
                            {shift.employee.name}
                          </p>
                          <p className="text-[10px] text-beige-400 mt-0.5">
                            {shift.service?.name || "General"}
                          </p>
                          <p className="text-[10px] text-beige-600 mt-0.5 font-medium">
                            {displayTime(shift.startTime)} – {displayTime(shift.endTime)}
                          </p>
                          <div className="absolute right-1 top-1 flex gap-0.5 opacity-0 transition-opacity group-hover:opacity-100">
                            <button
                              onClick={() => openEditForm(shift)}
                              className="rounded p-0.5 text-beige-400 hover:bg-beige-200 hover:text-beige-700"
                              title="Edit"
                            >
                              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                <path d="M17 3a2.85 2.83 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5Z" />
                              </svg>
                            </button>
                            <button
                              onClick={() => handleDelete(shift.id)}
                              className="rounded p-0.5 text-red-400 hover:bg-red-100 hover:text-red-600"
                              title="Delete"
                            >
                              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                <line x1="18" x2="6" y1="6" y2="18" /><line x1="6" x2="18" y1="6" y2="18" />
                              </svg>
                            </button>
                          </div>
                        </div>
                      ))
                  ) : (
                    <button
                      onClick={() => openAddForm(date)}
                      className="flex h-full min-h-[60px] w-full items-center justify-center rounded-lg border border-dashed border-beige-200 text-beige-300 transition-colors hover:border-beige-400 hover:text-beige-500"
                    >
                      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <line x1="12" x2="12" y1="5" y2="19" /><line x1="5" x2="19" y1="12" y2="12" />
                      </svg>
                    </button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Summary table */}
      {!loading && filteredShifts.length > 0 && (
        <div className="rounded-card border border-beige-200 bg-white shadow-card overflow-hidden">
          <div className="border-b border-beige-100 px-6 py-4">
            <h2 className="font-serif text-lg font-semibold text-beige-700">
              All Shifts This Week
            </h2>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-beige-100 text-left text-xs font-medium uppercase tracking-wider text-beige-400">
                  <th className="px-6 py-3">Employee</th>
                  <th className="px-6 py-3">Date</th>
                  <th className="px-6 py-3">Time</th>
                  <th className="px-6 py-3">Service</th>
                  <th className="px-6 py-3 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-beige-50">
                {filteredShifts
                  .sort((a, b) => a.date.localeCompare(b.date) || a.startTime.localeCompare(b.startTime))
                  .map((shift) => (
                    <tr key={shift.id} className="transition-colors hover:bg-beige-50">
                      <td className="px-6 py-3">
                        <div className="flex items-center gap-2">
                          <div className="relative h-7 w-7 overflow-hidden rounded-full">
                            <Image src={shift.employee.imageUrl} alt={shift.employee.name} fill className="object-cover" sizes="28px" />
                          </div>
                          <span className="font-medium text-beige-700">{shift.employee.name}</span>
                        </div>
                      </td>
                      <td className="px-6 py-3 text-beige-600">
                        {new Date(shift.date).toLocaleDateString("en-US", { weekday: "short", month: "short", day: "numeric" })}
                      </td>
                      <td className="px-6 py-3 text-beige-600">
                        {displayTime(shift.startTime)} – {displayTime(shift.endTime)}
                      </td>
                      <td className="px-6 py-3 text-beige-600">{shift.service?.name || "General"}</td>
                      <td className="px-6 py-3 text-right">
                        <div className="flex items-center justify-end gap-2">
                          <button
                            onClick={() => openEditForm(shift)}
                            className="rounded-lg px-3 py-1.5 text-xs font-medium text-beige-600 transition-colors hover:bg-beige-100"
                          >
                            Edit
                          </button>
                          <button
                            onClick={() => handleDelete(shift.id)}
                            className="rounded-lg px-3 py-1.5 text-xs font-medium text-red-600 transition-colors hover:bg-red-50"
                          >
                            Delete
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {!loading && filteredShifts.length === 0 && (
        <div className="rounded-card border border-beige-200 bg-white p-12 text-center shadow-card">
          <p className="text-beige-400">No shifts found for this week.</p>
          <button onClick={() => openAddForm()} className="btn-primary mt-4">
            Add First Shift
          </button>
        </div>
      )}
    </div>
  );
}
