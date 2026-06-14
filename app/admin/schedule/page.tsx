"use client";

import { useState, useEffect, useMemo } from "react";
import Image from "next/image";

const DAYS = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"];

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

interface Booking {
  id: string;
  serviceId: string;
  employeeId: string;
  userId: string | null;
  date: string;
  timeSlot: string;
  name: string;
  email: string;
  phone: string;
  notes: string | null;
  status: "confirmed" | "pending" | "cancelled" | "completed";
  price: number;
  rating: number | null;
  review: string | null;
  service: Service;
  employee: Employee;
}

const STATUS_COLORS: Record<string, { bg: string; text: string; border: string }> = {
  confirmed: { bg: "bg-emerald-50", text: "text-emerald-700", border: "border-emerald-200" },
  pending: { bg: "bg-amber-50", text: "text-amber-700", border: "border-amber-200" },
  completed: { bg: "bg-beige-50", text: "text-beige-600", border: "border-beige-200" },
  cancelled: { bg: "bg-red-50", text: "text-red-500", border: "border-red-200" },
};

function getDayOfWeek(dateStr: string): number {
  const d = new Date(dateStr);
  const day = d.getDay(); // 0=Sun
  return day === 0 ? 6 : day - 1; // 0=Mon
}

function timeSlotToMinutes(slot: string): number {
  const match = slot.match(/(\d+):(\d+)\s*(AM|PM)/i);
  if (!match) return 0;
  let h = parseInt(match[1]);
  const m = parseInt(match[2]);
  const period = match[3].toUpperCase();
  if (period === "PM" && h !== 12) h += 12;
  if (period === "AM" && h === 12) h = 0;
  return h * 60 + m;
}

export default function ScheduleManagementPage() {
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [loading, setLoading] = useState(true);
  const [filterEmployee, setFilterEmployee] = useState("");
  const [selectedBooking, setSelectedBooking] = useState<Booking | null>(null);

  // Week navigation
  const [currentWeekStart, setCurrentWeekStart] = useState(() => {
    const now = new Date();
    const day = now.getDay();
    const diff = day === 0 ? 6 : day - 1;
    const monday = new Date(now);
    monday.setDate(now.getDate() - diff);
    monday.setHours(0, 0, 0, 0);
    return monday;
  });

  useEffect(() => {
    fetchData();
  }, []);

  async function fetchData() {
    try {
      const [bookingsRes, employeesRes] = await Promise.all([
        fetch("/api/bookings"),
        fetch("/api/employees"),
      ]);

      if (bookingsRes.ok) {
        const data = await bookingsRes.json();
        setBookings(data.bookings || []);
      }
      if (employeesRes.ok) {
        const data = await employeesRes.json();
        setEmployees(data.employees || data || []);
      }
    } catch {
      // silently fail
    } finally {
      setLoading(false);
    }
  }

  const weekDays = useMemo(() => {
    return Array.from({ length: 7 }, (_, i) => {
      const date = new Date(currentWeekStart);
      date.setDate(date.getDate() + i);
      return date;
    });
  }, [currentWeekStart]);

  const formatDateKey = (d: Date) =>
    `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;

  // Filter bookings to current week and group by day
  const bookingsByDay = useMemo(() => {
    const map: Record<number, Booking[]> = {};
    for (let i = 0; i < 7; i++) map[i] = [];

    const weekStartKey = formatDateKey(currentWeekStart);
    const weekEndKey = formatDateKey(weekDays[6]);

    for (const b of bookings) {
      const bDate = b.date.split("T")[0];
      if (bDate < weekStartKey || bDate > weekEndKey) continue;
      if (filterEmployee && b.employeeId !== filterEmployee) continue;
      const dow = getDayOfWeek(b.date);
      map[dow].push(b);
    }

    // Sort each day by time slot
    for (const key of Object.keys(map)) {
      map[Number(key)].sort(
        (a, b) => timeSlotToMinutes(a.timeSlot) - timeSlotToMinutes(b.timeSlot)
      );
    }
    return map;
  }, [bookings, currentWeekStart, weekDays, filterEmployee]);

  const totalBookings = Object.values(bookingsByDay).flat().length;

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
            Schedule Overview
          </h1>
          <p className="mt-1 text-beige-600">
            View all bookings across the week.
          </p>
        </div>
      </div>

      {/* Week Navigator + Filter */}
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
                {weekDays[6].toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric" })}
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
              {totalBookings} booking{totalBookings !== 1 ? "s" : ""}
            </span>
          </div>
        </div>
      </div>

      {/* Booking Detail Modal */}
      {selectedBooking && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-beige-900/40 p-4 backdrop-blur-sm" onClick={() => setSelectedBooking(null)}>
          <div className="w-full max-w-md overflow-hidden rounded-card border border-beige-200 bg-white shadow-xl" onClick={(e) => e.stopPropagation()}>
            <div className="border-b border-beige-100 px-6 py-4">
              <div className="flex items-center justify-between">
                <h2 className="font-serif text-lg font-semibold text-beige-700">Booking Details</h2>
                <button onClick={() => setSelectedBooking(null)} className="flex h-8 w-8 items-center justify-center rounded-full text-beige-400 transition-colors hover:bg-beige-100 hover:text-beige-600">
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <line x1="18" x2="6" y1="6" y2="18" /><line x1="6" x2="18" y1="6" y2="18" />
                  </svg>
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
                <div>
                  <p className="text-xs text-beige-400">Client</p>
                  <p className="font-medium text-beige-700">{selectedBooking.name}</p>
                </div>
                <div>
                  <p className="text-xs text-beige-400">Time</p>
                  <p className="font-medium text-beige-700">{selectedBooking.timeSlot}</p>
                </div>
                <div>
                  <p className="text-xs text-beige-400">Date</p>
                  <p className="font-medium text-beige-700">
                    {new Date(selectedBooking.date).toLocaleDateString("en-US", { weekday: "short", month: "short", day: "numeric" })}
                  </p>
                </div>
                <div>
                  <p className="text-xs text-beige-400">Price</p>
                  <p className="font-medium text-beige-700">${selectedBooking.price.toFixed(2)}</p>
                </div>
                <div>
                  <p className="text-xs text-beige-400">Phone</p>
                  <p className="font-medium text-beige-700">{selectedBooking.phone}</p>
                </div>
                <div>
                  <p className="text-xs text-beige-400">Status</p>
                  <span className={`inline-block rounded-full px-2 py-0.5 text-xs font-medium ${STATUS_COLORS[selectedBooking.status]?.bg} ${STATUS_COLORS[selectedBooking.status]?.text}`}>
                    {selectedBooking.status}
                  </span>
                </div>
              </div>
              {selectedBooking.notes && (
                <div>
                  <p className="text-xs text-beige-400">Notes</p>
                  <p className="text-sm text-beige-600">{selectedBooking.notes}</p>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Weekly Booking Grid */}
      {loading ? (
        <div className="flex items-center justify-center py-12">
          <div className="h-8 w-8 animate-spin rounded-full border-2 border-beige-300 border-t-beige-600" />
        </div>
      ) : (
        <div className="rounded-card border border-beige-200 bg-white shadow-card overflow-hidden">
          {/* Desktop grid */}
          <div className="hidden md:block overflow-x-auto">
            <div className="grid grid-cols-7 gap-px bg-beige-100">
              {DAYS.map((day, dayIdx) => {
                const date = weekDays[dayIdx];
                const isToday = formatDateKey(new Date()) === formatDateKey(date);
                const dayBookings = bookingsByDay[dayIdx];

                return (
                  <div key={day} className="bg-white min-h-[160px]">
                    <div className={`px-3 py-2.5 text-center ${isToday ? "bg-beige-600" : "bg-beige-50"}`}>
                      <p className={`text-xs font-semibold uppercase tracking-wider ${isToday ? "text-white" : "text-beige-600"}`}>
                        {day}
                      </p>
                      <p className={`text-sm font-bold ${isToday ? "text-white" : "text-beige-800"}`}>
                        {date.getDate()}
                      </p>
                    </div>
                    <div className="space-y-1 p-2">
                      {dayBookings.length > 0 ? (
                        dayBookings.map((booking) => (
                          <div
                            key={booking.id}
                            onClick={() => setSelectedBooking(booking)}
                            className={`cursor-pointer rounded-lg border p-2 transition-colors hover:shadow-sm ${
                              STATUS_COLORS[booking.status]?.bg || "bg-beige-50"
                            } ${STATUS_COLORS[booking.status]?.border || "border-beige-200"}`}
                          >
                            <p className={`text-[10px] font-medium leading-tight truncate ${
                              STATUS_COLORS[booking.status]?.text || "text-beige-700"
                            }`}>
                              {booking.timeSlot}
                            </p>
                            <p className="text-[10px] text-beige-500 truncate mt-0.5">
                              {booking.name}
                            </p>
                            <p className="text-[10px] text-beige-400 truncate">
                              {booking.employee.name}
                            </p>
                          </div>
                        ))
                      ) : (
                        <div className="flex h-full min-h-[60px] items-center justify-center">
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
              const isToday = formatDateKey(new Date()) === formatDateKey(date);
              const dayBookings = bookingsByDay[dayIdx];

              return (
                <div key={day}>
                  <div className={`px-4 py-3 ${isToday ? "bg-beige-600" : "bg-beige-50"}`}>
                    <p className={`text-xs font-semibold uppercase tracking-wider ${isToday ? "text-white" : "text-beige-600"}`}>
                      {day} — {date.toLocaleDateString("en-US", { month: "short", day: "numeric" })}
                    </p>
                  </div>
                  <div className="p-2 space-y-1.5">
                    {dayBookings.length > 0 ? (
                      dayBookings.map((booking) => (
                        <div
                          key={booking.id}
                          onClick={() => setSelectedBooking(booking)}
                          className={`cursor-pointer rounded-lg border p-3 transition-colors ${
                            STATUS_COLORS[booking.status]?.bg || "bg-beige-50"
                          } ${STATUS_COLORS[booking.status]?.border || "border-beige-200"}`}
                        >
                          <div className="flex items-center justify-between">
                            <p className={`text-sm font-medium ${STATUS_COLORS[booking.status]?.text || "text-beige-700"}`}>
                              {booking.name} — {booking.service.name}
                            </p>
                            <span className="text-xs text-beige-500">{booking.timeSlot}</span>
                          </div>
                          <p className="text-xs text-beige-500 mt-1">{booking.employee.name}</p>
                        </div>
                      ))
                    ) : (
                      <p className="text-center text-sm text-beige-400 py-4">No bookings</p>
                    )}
                  </div>
                </div>
              );
            })}
          </div>

          {totalBookings === 0 && (
            <div className="px-6 py-12 text-center">
              <p className="text-beige-400">No bookings for this week.</p>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
