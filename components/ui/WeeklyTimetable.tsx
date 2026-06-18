"use client";

import { useState, useEffect, useMemo, useRef } from "react";
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
  price?: number;
}

interface WeeklyTimetableProps {
  employeeId: string;
}

const DAYS = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];
const FULL_DAYS = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"];

const HOUR_START = 8; // 8 AM
const HOUR_END = 20; // 8 PM
const HOUR_HEIGHT = 64; // px per hour

const CATEGORY_COLORS: Record<string, { bg: string; text: string; border: string }> = {
  Hair: { bg: "bg-amber-100", text: "text-amber-800", border: "border-l-amber-400" },
  Skin: { bg: "bg-rose-100", text: "text-rose-800", border: "border-l-rose-400" },
  Nails: { bg: "bg-pink-100", text: "text-pink-800", border: "border-l-pink-400" },
  Body: { bg: "bg-green-100", text: "text-green-800", border: "border-l-green-400" },
  Bridal: { bg: "bg-purple-100", text: "text-purple-800", border: "border-l-purple-400" },
};

const STATUS_BADGE: Record<string, { bg: string; text: string }> = {
  confirmed: { bg: "bg-emerald-100", text: "text-emerald-700" },
  pending: { bg: "bg-amber-100", text: "text-amber-700" },
  completed: { bg: "bg-beige-200", text: "text-beige-700" },
  cancelled: { bg: "bg-red-100", text: "text-red-600" },
};

const TIME_GUTTER_WIDTH = 56; // px, matches the fixed time label column

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

export default function WeeklyTimetable({ employeeId }: WeeklyTimetableProps) {
  const [schedules, setSchedules] = useState<ScheduleEntry[]>([]);
  const [bookings, setBookings] = useState<BookingEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [weekStart, setWeekStart] = useState(() => getMonday(new Date()));
  const [selectedBooking, setSelectedBooking] = useState<BookingEntry | null>(null);
  const scrollRef = useRef<HTMLDivElement>(null);

  const weekDays = useMemo(() => {
    return Array.from({ length: 7 }, (_, i) => {
      const date = new Date(weekStart);
      date.setDate(date.getDate() + i);
      return date;
    });
  }, [weekStart]);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = 0;
    }
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

  // Group bookings by day index (0=Mon, 6=Sun)
  const bookingsByDay = useMemo(() => {
    const map: BookingEntry[][] = Array.from({ length: 7 }, () => []);
    for (const b of bookings) {
      const parts = b.date.split("T")[0].split("-");
      const bDate = new Date(Date.UTC(Number(parts[0]), Number(parts[1]) - 1, Number(parts[2])));
      const day = bDate.getUTCDay();
      const dbDay = day === 0 ? 6 : day - 1;
      map[dbDay].push(b);
    }
    for (let i = 0; i < 7; i++) {
      map[i].sort((a, b) => {
        const aTime = a.slotStart || a.timeSlot;
        const bTime = b.slotStart || b.timeSlot;
        return timeToMinutes(aTime) - timeToMinutes(bTime);
      });
    }
    return map;
  }, [bookings]);

  // Group schedules by day
  const schedulesByDay = useMemo(() => {
    const map: ScheduleEntry[][] = Array.from({ length: 7 }, () => []);
    for (const s of schedules) {
      map[s.dayOfWeek]?.push(s);
    }
    return map;
  }, [schedules]);

  // Hour labels
  const hours = useMemo(() => {
    const arr: { label: string; minutes: number }[] = [];
    for (let h = HOUR_START; h <= HOUR_END; h++) {
      const period = h >= 12 ? "PM" : "AM";
      const display = h === 0 ? 12 : h > 12 ? h - 12 : h;
      arr.push({ label: `${display} ${period}`, minutes: h * 60 });
    }
    return arr;
  }, []);

  const totalHeight = (HOUR_END - HOUR_START + 1) * HOUR_HEIGHT;

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

  // Current time line
  const now = new Date();
  const currentMinutes = now.getHours() * 60 + now.getMinutes();
  const todayKey = formatDateKey(now);
  const showTimeLine =
    currentMinutes >= HOUR_START * 60 && currentMinutes <= HOUR_END * 60
      ? ((currentMinutes - HOUR_START * 60) / 60) * HOUR_HEIGHT
      : null;

  return (
    <div className="rounded-card border border-beige-200 bg-white shadow-card overflow-hidden">
      {/* Header with navigation */}
      <div className="border-b border-beige-100 px-6 py-4">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="font-serif text-lg font-semibold text-beige-700">Weekly Timetable</h3>
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
          {/* Desktop time-grid */}
          <div className="hidden md:block">
            {/* Day headers row */}
            <div className="flex border-b-2 border-beige-200">
              {/* Empty gutter for time labels */}
              <div className="flex-shrink-0 border-r-2 border-beige-200 bg-beige-50" style={{ width: TIME_GUTTER_WIDTH }} />
              {/* Day header columns */}
              {DAYS.map((day, dayIdx) => {
                const date = weekDays[dayIdx];
                const isToday = formatDateKey(date) === todayKey;
                return (
                  <div
                    key={day}
                    className={cn(
                      "flex-1 px-2 py-3 text-center border-l border-beige-200",
                      isToday && "bg-beige-600/5"
                    )}
                  >
                    <p className={cn(
                      "text-[10px] font-semibold uppercase tracking-wider",
                      isToday ? "text-beige-600" : "text-beige-400"
                    )}>
                      {day}
                    </p>
                    <p className={cn(
                      "mt-0.5 text-lg font-bold",
                      isToday ? "text-beige-700" : "text-beige-600"
                    )}>
                      {date.getDate()}
                    </p>
                    {isToday && (
                      <div className="mx-auto mt-1 h-1.5 w-1.5 rounded-full bg-beige-600" />
                    )}
                  </div>
                );
              })}
            </div>

            {/* Scrollable time grid */}
            <div ref={scrollRef} className="overflow-y-auto" style={{ maxHeight: 520 }}>
              <div className="flex relative" style={{ height: totalHeight }}>
                {/* Time gutter column */}
                <div
                  className="flex-shrink-0 relative border-r-2 border-beige-200 bg-beige-50/50"
                  style={{ width: TIME_GUTTER_WIDTH }}
                >
                  {hours.map((hour, i) => (
                    <div
                      key={hour.minutes}
                      className="absolute right-2 flex items-start pt-0 text-[10px] font-medium text-beige-400 select-none"
                      style={{ top: i * HOUR_HEIGHT, height: HOUR_HEIGHT }}
                    >
                      {hour.label}
                    </div>
                  ))}
                </div>

                {/* Day columns */}
                {DAYS.map((day, dayIdx) => {
                  const date = weekDays[dayIdx];
                  const isToday = formatDateKey(date) === todayKey;
                  const daySchedules = schedulesByDay[dayIdx];
                  const dayBookings = bookingsByDay[dayIdx];
                  const hasAvailability = daySchedules.length > 0;

                  return (
                    <div
                      key={day}
                      className={cn(
                        "flex-1 relative border-l border-beige-200",
                        isToday && "bg-beige-50/40"
                      )}
                    >
                      {/* Hour grid lines */}
                      {hours.map((hour, i) => (
                        <div
                          key={hour.minutes}
                          className="absolute left-0 right-0 border-t border-beige-200/70"
                          style={{ top: i * HOUR_HEIGHT }}
                        />
                      ))}

                      {/* Schedule availability blocks */}
                      {daySchedules.map((sched, sIdx) => {
                        const startMin = timeToMinutes(sched.startTime);
                        const endMin = timeToMinutes(sched.endTime);
                        if (startMin < HOUR_START * 60 || endMin > (HOUR_END + 1) * 60) return null;
                        const top = ((startMin - HOUR_START * 60) / 60) * HOUR_HEIGHT;
                        const height = ((endMin - startMin) / 60) * HOUR_HEIGHT;
                        return (
                          <div
                            key={`sched-${sIdx}`}
                            className="absolute left-0.5 right-0.5 rounded-sm bg-beige-100/60 border border-beige-200"
                            style={{ top, height }}
                          />
                        );
                      })}

                      {/* Booking blocks */}
                      {dayBookings.map((booking) => {
                        const slotStart = booking.slotStart || booking.timeSlot;
                        const slotEnd = booking.slotEnd;
                        const startMin = timeToMinutes(slotStart);
                        const endMin = slotEnd ? timeToMinutes(slotEnd) : startMin + 60;
                        if (startMin < HOUR_START * 60 || startMin > HOUR_END * 60) return null;
                        const top = ((startMin - HOUR_START * 60) / 60) * HOUR_HEIGHT;
                        const height = Math.max(((endMin - startMin) / 60) * HOUR_HEIGHT, 28);
                        const cat = booking.service?.category || "Hair";
                        const colors = CATEGORY_COLORS[cat] || CATEGORY_COLORS.Hair;
                        const statusColors = STATUS_BADGE[booking.status] || STATUS_BADGE.pending;

                        return (
                          <motion.button
                            key={booking.id}
                            initial={{ opacity: 0, y: -2 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ duration: 0.2 }}
                            onClick={() => setSelectedBooking(booking)}
                            className={cn(
                              "absolute left-1 right-1 rounded-md border-l-[3px] px-2 py-1 text-left cursor-pointer overflow-hidden",
                              "transition-shadow hover:shadow-md hover:z-10",
                              colors.bg,
                              colors.border
                            )}
                            style={{ top: top + 1, height: height - 2 }}
                          >
                            <p className={cn("text-[11px] font-bold leading-tight truncate", colors.text)}>
                              {displayTime(slotStart)}
                              {slotEnd ? ` – ${displayTime(slotEnd)}` : ""}
                            </p>
                            {height > 36 && (
                              <p className={cn("text-[10px] font-medium leading-tight truncate mt-0.5", colors.text)}>
                                {booking.name}
                              </p>
                            )}
                            {height > 52 && (
                              <p className={cn("text-[9px] leading-tight truncate opacity-70", colors.text)}>
                                {booking.service?.name}
                              </p>
                            )}
                            <span className={cn(
                              "absolute top-1 right-1 rounded-full px-1.5 py-px text-[8px] font-semibold",
                              statusColors.bg, statusColors.text
                            )}>
                              {booking.status.slice(0, 4)}
                            </span>
                          </motion.button>
                        );
                      })}

                      {/* Current time indicator */}
                      {isToday && showTimeLine !== null && (
                        <div
                          className="absolute left-0 right-0 z-20 pointer-events-none"
                          style={{ top: showTimeLine }}
                        >
                          <div className="relative">
                            <div className="absolute left-0 top-0 h-2.5 w-2.5 -translate-x-1/2 -translate-y-1/2 rounded-full bg-red-500" />
                            <div className="h-[2px] w-full bg-red-500" />
                          </div>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          </div>

          {/* Mobile day-by-day view */}
          <div className="md:hidden">
            {FULL_DAYS.map((day, dayIdx) => {
              const date = weekDays[dayIdx];
              const isToday = formatDateKey(date) === todayKey;
              const dayBookings = bookingsByDay[dayIdx];
              const daySchedules = schedulesByDay[dayIdx];
              const hasAvailability = daySchedules.length > 0;

              return (
                <div key={day}>
                  <div className={cn(
                    "flex items-center gap-3 px-4 py-3",
                    isToday ? "bg-beige-600" : "bg-beige-50"
                  )}>
                    <div className="text-center">
                      <p className={cn(
                        "text-[10px] font-semibold uppercase",
                        isToday ? "text-beige-200" : "text-beige-500"
                      )}>
                        {day.slice(0, 3)}
                      </p>
                      <p className={cn(
                        "text-lg font-bold",
                        isToday ? "text-white" : "text-beige-700"
                      )}>
                        {date.getDate()}
                      </p>
                    </div>
                    <div className="flex-1">
                      <p className={cn(
                        "text-xs font-medium",
                        isToday ? "text-beige-100" : "text-beige-500"
                      )}>
                        {dayBookings.length} booking{dayBookings.length !== 1 ? "s" : ""}
                        {!hasAvailability && " · Day off"}
                      </p>
                    </div>
                  </div>

                  {dayBookings.length > 0 && (
                    <div className="px-3 pb-2 space-y-1.5">
                      {dayBookings.map((booking) => {
                        const slotStart = booking.slotStart || booking.timeSlot;
                        const slotEnd = booking.slotEnd;
                        const cat = booking.service?.category || "Hair";
                        const colors = CATEGORY_COLORS[cat] || CATEGORY_COLORS.Hair;
                        const statusColors = STATUS_BADGE[booking.status] || STATUS_BADGE.pending;

                        return (
                          <button
                            key={booking.id}
                            onClick={() => setSelectedBooking(booking)}
                            className={cn(
                              "w-full text-left rounded-lg border-l-[3px] px-3 py-2.5 transition-all active:scale-[0.98]",
                              colors.bg,
                              colors.border
                            )}
                          >
                            <div className="flex items-center justify-between">
                              <p className={cn("text-xs font-bold", colors.text)}>
                                {displayTime(slotStart)}
                                {slotEnd ? ` – ${displayTime(slotEnd)}` : ""}
                              </p>
                              <span className={cn(
                                "rounded-full px-2 py-px text-[10px] font-semibold",
                                statusColors.bg, statusColors.text
                              )}>
                                {booking.status}
                              </span>
                            </div>
                            <p className={cn("text-sm font-semibold mt-0.5", colors.text)}>
                              {booking.name}
                            </p>
                            <p className={cn("text-xs opacity-70 mt-0.5", colors.text)}>
                              {booking.service?.name}
                            </p>
                          </button>
                        );
                      })}
                    </div>
                  )}

                  {!hasAvailability && dayBookings.length === 0 && (
                    <div className="px-4 py-4 text-center">
                      <p className="text-xs text-beige-400 italic">No shifts scheduled</p>
                    </div>
                  )}

                  {dayIdx < 6 && <div className="border-b border-beige-100" />}
                </div>
              );
            })}
          </div>

          {schedules.length === 0 && bookings.length === 0 && (
            <div className="px-6 py-12 text-center">
              <p className="text-beige-400">No schedule or bookings configured yet.</p>
            </div>
          )}
        </>
      )}

      {/* Category legend */}
      <div className="border-t border-beige-100 px-6 py-3">
        <div className="flex flex-wrap items-center gap-3">
          <span className="text-[10px] font-medium uppercase tracking-wider text-beige-400">Legend:</span>
          {Object.entries(CATEGORY_COLORS).map(([cat, colors]) => (
            <div key={cat} className="flex items-center gap-1.5">
              <div className={cn("h-2.5 w-2.5 rounded-sm border-l-[2px]", colors.bg, colors.border)} />
              <span className="text-[10px] text-beige-500">{cat}</span>
            </div>
          ))}
        </div>
      </div>

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
              className="fixed right-0 top-0 z-50 h-full w-full max-w-sm border-l border-beige-200 bg-white shadow-xl"
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
                <div className="flex-1 overflow-y-auto px-6 py-5 space-y-5">
                  {/* Status badge */}
                  <div>
                    <span className={cn(
                      "inline-block rounded-full px-3 py-1 text-xs font-semibold",
                      STATUS_BADGE[selectedBooking.status]?.bg || "bg-beige-100",
                      STATUS_BADGE[selectedBooking.status]?.text || "text-beige-700"
                    )}>
                      {selectedBooking.status.charAt(0).toUpperCase() + selectedBooking.status.slice(1)}
                    </span>
                  </div>

                  <div className="space-y-3">
                    <div className="flex items-start gap-3">
                      <div className="mt-0.5 flex h-8 w-8 items-center justify-center rounded-full bg-beige-100">
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="text-beige-500">
                          <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" /><circle cx="12" cy="7" r="4" />
                        </svg>
                      </div>
                      <div>
                        <p className="text-[10px] font-medium uppercase tracking-wider text-beige-400">Client</p>
                        <p className="text-sm font-semibold text-beige-700">{selectedBooking.name}</p>
                      </div>
                    </div>

                    <div className="flex items-start gap-3">
                      <div className="mt-0.5 flex h-8 w-8 items-center justify-center rounded-full bg-beige-100">
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="text-beige-500">
                          <rect x="3" y="4" width="18" height="18" rx="2" ry="2" /><line x1="16" y1="2" x2="16" y2="6" /><line x1="8" y1="2" x2="8" y2="6" /><line x1="3" y1="10" x2="21" y2="10" />
                        </svg>
                      </div>
                      <div>
                        <p className="text-[10px] font-medium uppercase tracking-wider text-beige-400">Date</p>
                        <p className="text-sm font-medium text-beige-700">
                          {new Date(selectedBooking.date).toLocaleDateString("en-US", {
                            weekday: "long",
                            month: "long",
                            day: "numeric",
                          })}
                        </p>
                      </div>
                    </div>

                    <div className="flex items-start gap-3">
                      <div className="mt-0.5 flex h-8 w-8 items-center justify-center rounded-full bg-beige-100">
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="text-beige-500">
                          <circle cx="12" cy="12" r="10" /><polyline points="12 6 12 12 16 14" />
                        </svg>
                      </div>
                      <div>
                        <p className="text-[10px] font-medium uppercase tracking-wider text-beige-400">Time</p>
                        <p className="text-sm font-medium text-beige-700">
                          {displayTime(selectedBooking.slotStart || selectedBooking.timeSlot)}
                          {selectedBooking.slotEnd ? ` – ${displayTime(selectedBooking.slotEnd)}` : ""}
                        </p>
                      </div>
                    </div>

                    <div className="flex items-start gap-3">
                      <div className="mt-0.5 flex h-8 w-8 items-center justify-center rounded-full bg-beige-100">
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="text-beige-500">
                          <path d="M14.7 6.3a1 1 0 0 0 0 1.4l1.6 1.6a1 1 0 0 0 1.4 0l3.77-3.77a6 6 0 0 1-7.94 7.94l-6.91 6.91a2.12 2.12 0 0 1-3-3l6.91-6.91a6 6 0 0 1 7.94-7.94l-3.76 3.76z" />
                        </svg>
                      </div>
                      <div>
                        <p className="text-[10px] font-medium uppercase tracking-wider text-beige-400">Service</p>
                        <p className="text-sm font-medium text-beige-700">{selectedBooking.service?.name}</p>
                        <p className="text-xs text-beige-500">{selectedBooking.service?.category}</p>
                      </div>
                    </div>

                    {selectedBooking.price != null && (
                      <div className="flex items-start gap-3">
                        <div className="mt-0.5 flex h-8 w-8 items-center justify-center rounded-full bg-beige-100">
                          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="text-beige-500">
                            <line x1="12" y1="1" x2="12" y2="23" /><path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6" />
                          </svg>
                        </div>
                        <div>
                          <p className="text-[10px] font-medium uppercase tracking-wider text-beige-400">Price</p>
                          <p className="text-sm font-medium text-beige-700">₹{selectedBooking.price}</p>
                        </div>
                      </div>
                    )}
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
