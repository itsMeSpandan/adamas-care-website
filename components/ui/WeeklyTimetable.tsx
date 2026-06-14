"use client";

import { useState, useEffect, useMemo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { displayTime, cn } from "@/lib/utils";

interface ScheduleEntry {
  dayOfWeek: number;
  startTime: string;
  endTime: string;
  employeeId?: string;
}

interface BookingEntry {
  id: string;
  employeeId: string;
  date: string;
  slotStart: string | null;
  slotEnd: string | null;
  timeSlot: string;
  name: string;
  status: string;
  service: { name: string; category: string };
}

interface WeeklyTimetableProps {
  employeeId: string;
}

const DAYS = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"];

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

const CATEGORY_COLORS: Record<string, { bg: string; text: string }> = {
  Hair: { bg: "bg-beige-200", text: "text-beige-800" },
  Skin: { bg: "bg-amber-100", text: "text-amber-800" },
  Nails: { bg: "bg-rose-100", text: "text-rose-800" },
  Body: { bg: "bg-green-100", text: "text-green-800" },
  Bridal: { bg: "bg-purple-100", text: "text-purple-800" },
};

const STATUS_BADGE: Record<string, { bg: string; text: string }> = {
  confirmed: { bg: "bg-emerald-100", text: "text-emerald-700" },
  pending: { bg: "bg-amber-100", text: "text-amber-700" },
  completed: { bg: "bg-beige-200", text: "text-beige-700" },
  cancelled: { bg: "bg-red-100", text: "text-red-600" },
};

export default function WeeklyTimetable({ employeeId }: WeeklyTimetableProps) {
  const [schedules, setSchedules] = useState<ScheduleEntry[]>([]);
  const [bookings, setBookings] = useState<BookingEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [weekStart, setWeekStart] = useState(() => getMonday(new Date()));
  const [selectedBooking, setSelectedBooking] = useState<BookingEntry | null>(null);

  const weekDays = useMemo(() => {
    return Array.from({ length: 7 }, (_, i) => {
      const date = new Date(weekStart);
      date.setDate(date.getDate() + i);
      return date;
    });
  }, [weekStart]);

  useEffect(() => {
    async function fetchData() {
      setLoading(true);
      try {
        const weekEnd = new Date(weekStart);
        weekEnd.setDate(weekEnd.getDate() + 6);
        weekEnd.setHours(23, 59, 59, 999);

        const [schedulesRes, bookingsRes] = await Promise.all([
          fetch(`/api/employees/${employeeId}/schedule`),
          fetch(`/api/bookings`),
        ]);

        if (schedulesRes.ok) {
          const data = await schedulesRes.json();
          setSchedules(data.schedules || []);
        }

        if (bookingsRes.ok) {
          const data = await bookingsRes.json();
          const allBookings = (data.bookings || []) as BookingEntry[];
          const filtered = allBookings.filter((b) => {
            if (b.employeeId !== employeeId) return false;
            if (b.status === "cancelled") return false;
            const bDate = new Date(b.date);
            return bDate >= weekStart && bDate <= weekEnd;
          });
          setBookings(filtered);
        }
      } catch {
        // silently fail
      } finally {
        setLoading(false);
      }
    }
    fetchData();
  }, [employeeId, weekStart]);

  const groupedSchedule = useMemo(() => {
    const map: Record<number, ScheduleEntry[]> = {};
    for (let i = 0; i < 7; i++) map[i] = [];
    for (const s of schedules) {
      map[s.dayOfWeek]?.push(s);
    }
    for (const day of Object.keys(map)) {
      map[Number(day)].sort((a, b) => timeToMinutes(a.startTime) - timeToMinutes(b.startTime));
    }
    return map;
  }, [schedules]);

  const bookingsByDay = useMemo(() => {
    const map: Record<number, BookingEntry[]> = {};
    for (let i = 0; i < 7; i++) map[i] = [];
    for (const b of bookings) {
      const parts = b.date.split("T")[0].split("-");
      const bDate = new Date(Date.UTC(Number(parts[0]), Number(parts[1]) - 1, Number(parts[2])));
      const day = bDate.getUTCDay();
      const dbDay = day === 0 ? 6 : day - 1;
      map[dbDay].push(b);
    }
    for (const key of Object.keys(map)) {
      map[Number(key)].sort((a, b) => {
        const aTime = a.slotStart || a.timeSlot;
        const bTime = b.slotStart || b.timeSlot;
        return timeToMinutes(aTime) - timeToMinutes(bTime);
      });
    }
    return map;
  }, [bookings]);

  function prevWeek() {
    const d = new Date(weekStart);
    d.setDate(d.getDate() - 7);
    setWeekStart(d);
  }

  function nextWeek() {
    const d = new Date(weekStart);
    d.setDate(d.getDate() + 7);
    setWeekStart(d);
  }

  const isCurrentWeek = useMemo(() => {
    const today = getMonday(new Date());
    return weekStart.getTime() === today.getTime();
  }, [weekStart]);

  const formatDayLabel = (date: Date) => {
    return date.toLocaleDateString("en-US", { month: "short", day: "numeric" });
  };

  return (
    <div className="rounded-card border border-beige-200 bg-white shadow-card overflow-hidden">
      {/* Header with navigation */}
      <div className="border-b border-beige-100 px-6 py-4">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="font-serif text-lg font-semibold text-beige-700">My Schedule</h3>
            <p className="mt-1 text-sm text-beige-500">
              {formatDayLabel(weekDays[0])} – {formatDayLabel(weekDays[6])}
            </p>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={prevWeek}
              className="flex h-8 w-8 items-center justify-center rounded-lg border border-beige-300 text-beige-600 transition-colors hover:bg-beige-50"
            >
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <polyline points="15 18 9 12 15 6" />
              </svg>
            </button>
            <button
              onClick={nextWeek}
              className="flex h-8 w-8 items-center justify-center rounded-lg border border-beige-300 text-beige-600 transition-colors hover:bg-beige-50"
            >
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <polyline points="9 18 15 12 9 6" />
              </svg>
            </button>
            {!isCurrentWeek && (
              <button
                onClick={() => setWeekStart(getMonday(new Date()))}
                className="rounded-lg border border-beige-300 px-3 py-1.5 text-xs font-medium text-beige-600 transition-colors hover:bg-beige-50"
              >
                Today
              </button>
            )}
          </div>
        </div>
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-12">
          <div className="h-8 w-8 animate-spin rounded-full border-2 border-beige-300 border-t-beige-600" />
        </div>
      ) : (
        <>
          {/* Desktop 7-column grid */}
          <div className="hidden md:block overflow-x-auto">
            <div className="grid grid-cols-7 gap-px bg-beige-100">
              {DAYS.map((day, dayIdx) => {
                const date = weekDays[dayIdx];
                const isToday = formatDateKey(new Date()) === formatDateKey(date);
                const daySchedules = groupedSchedule[dayIdx];
                const dayBookings = bookingsByDay[dayIdx];
                const hasAvailability = daySchedules.length > 0;

                return (
                  <div key={day} className="bg-white">
                    <div className={cn("px-3 py-2.5 text-center", isToday ? "bg-beige-600" : "bg-beige-50")}>
                      <p className={cn("text-xs font-semibold uppercase tracking-wider", isToday ? "text-white" : "text-beige-600")}>
                        {day.slice(0, 3)}
                      </p>
                      <p className={cn("text-sm font-bold", isToday ? "text-white" : "text-beige-800")}>
                        {date.getDate()}
                      </p>
                    </div>
                    <div className="min-h-[200px] space-y-1 p-2">
                      {!hasAvailability ? (
                        <div className="flex h-full min-h-[100px] items-center justify-center">
                          <p className="text-[10px] text-beige-300 italic">Day off</p>
                        </div>
                      ) : (
                        <>
                          {daySchedules.map((s, idx) => (
                            <div key={idx} className="rounded-lg bg-beige-50 border border-beige-200 p-2 mb-1.5">
                              <p className="text-[10px] font-medium text-beige-500 mb-1">
                                {displayTime(s.startTime)} – {displayTime(s.endTime)}
                              </p>
                              {dayBookings
                                .filter((b) => {
                                  const bStart = timeToMinutes(b.slotStart || b.timeSlot);
                                  return bStart >= timeToMinutes(s.startTime) && bStart < timeToMinutes(s.endTime);
                                })
                                .map((booking) => {
                                  const cat = booking.service?.category || "Hair";
                                  const colors = CATEGORY_COLORS[cat] || CATEGORY_COLORS.Hair;
                                  return (
                                    <button
                                      key={booking.id}
                                      onClick={() => setSelectedBooking(booking)}
                                      className={cn(
                                        "w-full text-left rounded-md px-2 py-1.5 mb-1 transition-colors hover:opacity-80",
                                        colors.bg
                                      )}
                                    >
                                      <p className={cn("text-[10px] font-semibold leading-tight truncate", colors.text)}>
                                        {booking.slotStart || booking.timeSlot} {booking.name}
                                      </p>
                                      <p className={cn("text-[9px] truncate", colors.text, "opacity-70")}>
                                        {booking.service?.name}
                                      </p>
                                    </button>
                                  );
                                })}
                            </div>
                          ))}
                        </>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Mobile list view */}
          <div className="md:hidden divide-y divide-beige-100">
            {DAYS.map((day, dayIdx) => {
              const date = weekDays[dayIdx];
              const isToday = formatDateKey(new Date()) === formatDateKey(date);
              const daySchedules = groupedSchedule[dayIdx];
              const dayBookings = bookingsByDay[dayIdx];

              return (
                <div key={day}>
                  <div className={cn("px-4 py-3", isToday ? "bg-beige-600" : "bg-beige-50")}>
                    <p className={cn("text-xs font-semibold uppercase tracking-wider", isToday ? "text-white" : "text-beige-600")}>
                      {day} — {formatDayLabel(date)}
                    </p>
                  </div>
                  <div className="p-3 space-y-2">
                    {daySchedules.length === 0 ? (
                      <p className="text-center text-sm text-beige-400 py-4 italic">Day off</p>
                    ) : (
                      daySchedules.map((s, idx) => (
                        <div key={idx} className="rounded-lg bg-beige-50 border border-beige-200 p-3">
                          <p className="text-xs font-medium text-beige-600 mb-2">
                            {displayTime(s.startTime)} – {displayTime(s.endTime)}
                          </p>
                          {dayBookings
                            .filter((b) => {
                              const bStart = timeToMinutes(b.slotStart || b.timeSlot);
                              return bStart >= timeToMinutes(s.startTime) && bStart < timeToMinutes(s.endTime);
                            })
                            .map((booking) => {
                              const cat = booking.service?.category || "Hair";
                              const colors = CATEGORY_COLORS[cat] || CATEGORY_COLORS.Hair;
                              return (
                                <button
                                  key={booking.id}
                                  onClick={() => setSelectedBooking(booking)}
                                  className={cn(
                                    "w-full text-left rounded-md px-3 py-2 mb-1 transition-colors hover:opacity-80",
                                    colors.bg
                                  )}
                                >
                                  <p className={cn("text-xs font-semibold", colors.text)}>
                                    {booking.slotStart || booking.timeSlot} — {booking.name}
                                  </p>
                                  <p className={cn("text-[10px]", colors.text, "opacity-70")}>
                                    {booking.service?.name}
                                  </p>
                                </button>
                              );
                            })}
                        </div>
                      ))
                    )}
                  </div>
                </div>
              );
            })}
          </div>

          {schedules.length === 0 && (
            <div className="px-6 py-12 text-center">
              <p className="text-beige-400">No schedule configured yet.</p>
            </div>
          )}
        </>
      )}

      {/* Booking detail drawer */}
      <AnimatePresence>
        {selectedBooking && (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 z-40 bg-beige-900/30 backdrop-blur-sm"
              onClick={() => setSelectedBooking(null)}
            />
            <motion.div
              initial={{ x: "100%" }}
              animate={{ x: 0 }}
              exit={{ x: "100%" }}
              transition={{ type: "spring", damping: 30, stiffness: 300 }}
              className="fixed right-0 top-0 z-50 h-full w-full max-w-md border-l border-beige-200 bg-white shadow-xl"
            >
              <div className="flex h-full flex-col">
                <div className="border-b border-beige-100 px-6 py-4">
                  <div className="flex items-center justify-between">
                    <h3 className="font-serif text-lg font-semibold text-beige-700">
                      Booking Details
                    </h3>
                    <button
                      onClick={() => setSelectedBooking(null)}
                      className="flex h-8 w-8 items-center justify-center rounded-full text-beige-400 transition-colors hover:bg-beige-100 hover:text-beige-600"
                    >
                      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" />
                      </svg>
                    </button>
                  </div>
                </div>
                <div className="flex-1 overflow-y-auto px-6 py-5 space-y-4">
                  <div>
                    <p className="text-xs text-beige-400">Client</p>
                    <p className="text-sm font-semibold text-beige-700">{selectedBooking.name}</p>
                  </div>
                  <div>
                    <p className="text-xs text-beige-400">Service</p>
                    <p className="text-sm font-medium text-beige-700">{selectedBooking.service?.name}</p>
                  </div>
                  <div>
                    <p className="text-xs text-beige-400">Category</p>
                    <p className="text-sm font-medium text-beige-700">{selectedBooking.service?.category}</p>
                  </div>
                  <div>
                    <p className="text-xs text-beige-400">Date</p>
                    <p className="text-sm font-medium text-beige-700">
                      {new Date(selectedBooking.date).toLocaleDateString("en-US", {
                        weekday: "long",
                        month: "long",
                        day: "numeric",
                        year: "numeric",
                      })}
                    </p>
                  </div>
                  <div>
                    <p className="text-xs text-beige-400">Time</p>
                    <p className="text-sm font-medium text-beige-700">
                      {selectedBooking.slotStart || selectedBooking.timeSlot}
                      {selectedBooking.slotEnd ? ` – ${selectedBooking.slotEnd}` : ""}
                    </p>
                  </div>
                  <div>
                    <p className="text-xs text-beige-400">Status</p>
                    <span className={cn(
                      "inline-block rounded-full px-2.5 py-0.5 text-xs font-medium",
                      STATUS_BADGE[selectedBooking.status]?.bg || "bg-beige-100",
                      STATUS_BADGE[selectedBooking.status]?.text || "text-beige-700"
                    )}>
                      {selectedBooking.status}
                    </span>
                  </div>
                </div>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </div>
  );
}
