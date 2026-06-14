"use client";

import { useState, useMemo } from "react";
import { displayTime } from "@/lib/utils";

interface ScheduleEntry {
  id?: string;
  dayOfWeek: number;
  startTime: string;
  endTime: string;
  serviceName?: string;
  employeeName?: string;
  employeeId?: string;
}

interface WeeklyTimetableProps {
  schedules: ScheduleEntry[];
  showEmployee?: boolean;
  onEntryClick?: (entry: ScheduleEntry) => void;
}

const DAYS = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"];

function timeToMinutes(time: string): number {
  const [h, m] = time.split(":").map(Number);
  return h * 60 + m;
}

export default function WeeklyTimetable({ schedules, showEmployee = false, onEntryClick }: WeeklyTimetableProps) {
  const [selectedDay, setSelectedDay] = useState<number | null>(null);

  const grouped = useMemo(() => {
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

  const hasAnySchedule = schedules.length > 0;

  return (
    <div className="rounded-card border border-beige-200 bg-white shadow-card overflow-hidden">
      <div className="border-b border-beige-100 px-6 py-4">
        <h3 className="font-serif text-lg font-semibold text-beige-700">Weekly Schedule</h3>
        <p className="mt-1 text-sm text-beige-500">9:00 AM - 6:00 PM</p>
      </div>

      {/* Mobile day selector */}
      <div className="flex gap-2 overflow-x-auto p-4 md:hidden">
        {DAYS.map((day, idx) => (
          <button
            key={day}
            onClick={() => setSelectedDay(selectedDay === idx ? null : idx)}
            className={`flex-shrink-0 rounded-lg px-4 py-2 text-sm font-medium transition-colors ${
              selectedDay === idx
                ? "bg-beige-600 text-white"
                : grouped[idx].length > 0
                  ? "bg-beige-100 text-beige-600 hover:bg-beige-200"
                  : "bg-beige-50 text-beige-300"
            }`}
          >
            {day.slice(0, 3)}
          </button>
        ))}
      </div>

      {/* Desktop card-based grid */}
      <div className="hidden md:block overflow-x-auto">
        <div className="grid grid-cols-7 gap-px bg-beige-100">
          {DAYS.map((day, dayIdx) => (
            <div key={day} className="bg-white">
              <div className={`px-3 py-2.5 text-center text-xs font-semibold uppercase tracking-wider ${
                grouped[dayIdx].length > 0 ? "text-beige-700 bg-beige-50" : "text-beige-400"
              }`}>
                {day}
              </div>
              <div className="min-h-[120px] space-y-1.5 p-2">
                {grouped[dayIdx].length > 0 ? (
                  grouped[dayIdx].map((entry, idx) => (
                    <div
                      key={idx}
                      onClick={onEntryClick ? () => onEntryClick(entry) : undefined}
                      className={`rounded-lg bg-beige-50 border border-beige-200 p-2.5 transition-colors ${onEntryClick ? "cursor-pointer hover:bg-beige-100 hover:border-beige-300" : "hover:bg-beige-100"}`}
                    >
                      <p className="text-xs font-medium text-beige-700 leading-tight">
                        {entry.serviceName || "General"}
                      </p>
                      {showEmployee && entry.employeeName && (
                        <p className="text-[10px] text-beige-500 mt-0.5 truncate">
                          {entry.employeeName}
                        </p>
                      )}
                      <p className="text-[10px] text-beige-400 mt-1">
                        {displayTime(entry.startTime)} - {displayTime(entry.endTime)}
                      </p>
                    </div>
                  ))
                ) : (
                  <div className="flex h-full items-center justify-center">
                    <p className="text-[10px] text-beige-300">Off</p>
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Mobile cards for selected day */}
      {selectedDay !== null && (
        <div className="p-4 md:hidden">
          <div className="space-y-2">
            {grouped[selectedDay].length > 0 ? (
              grouped[selectedDay].map((entry, idx) => (
                <div key={idx} onClick={onEntryClick ? () => onEntryClick(entry) : undefined} className={`rounded-lg bg-beige-50 border border-beige-200 p-3 ${onEntryClick ? "cursor-pointer hover:bg-beige-100 hover:border-beige-300" : ""}`}>
                  <div className="flex items-center justify-between">
                    <p className="text-sm font-medium text-beige-700">
                      {entry.serviceName || "General"}
                    </p>
                    <span className="text-xs text-beige-500">
                      {displayTime(entry.startTime)} - {displayTime(entry.endTime)}
                    </span>
                  </div>
                  {showEmployee && entry.employeeName && (
                    <p className="text-xs text-beige-500 mt-1">{entry.employeeName}</p>
                  )}
                </div>
              ))
            ) : (
              <p className="text-center text-sm text-beige-400 py-4">No schedule for this day</p>
            )}
          </div>
        </div>
      )}

      {!hasAnySchedule && (
        <div className="px-6 py-12 text-center">
          <p className="text-beige-400">No schedule configured yet.</p>
        </div>
      )}
    </div>
  );
}
