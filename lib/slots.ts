/**
 * lib/slots.ts — Centralized time/slot helper functions.
 *
 * Extracted from:
 *   - app/api/availability/route.ts
 *   - app/api/available-slots/route.ts
 *   - app/api/availability/dates/route.ts
 *
 * Single source of truth for time arithmetic used across availability,
 * booking, and scheduling logic.
 */

// ─── Time ↔ Minutes Conversion ────────────────────────────────────────────────

/** Convert "HH:MM" (24h) to total minutes since midnight. */
export function timeToMinutes(time: string): number {
  const [h, m] = time.split(":").map(Number);
  return h * 60 + m;
}

/** Convert total minutes since midnight to "HH:MM" (24h, zero-padded). */
export function minutesToTime(minutes: number): string {
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  return `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}`;
}

/** Convert "12h display" string like "10:00 AM" or "HH:MM" to minutes. */
export function parseDisplayTime(slot: string): number {
  // If already 24h format, just convert directly
  if (/^\d{1,2}:\d{2}$/.test(slot)) {
    return timeToMinutes(slot);
  }
  // Handle 12h format: "10:00 AM"
  const match = slot.match(/^(\d{1,2}):(\d{2})\s*(AM|PM)$/i);
  if (!match) return timeToMinutes(slot);
  let hours = parseInt(match[1], 10);
  const minutes = parseInt(match[2], 10);
  const period = match[3].toUpperCase();
  if (period === "PM" && hours !== 12) hours += 12;
  if (period === "AM" && hours === 12) hours = 0;
  return hours * 60 + minutes;
}

/** Convert "HH:MM" (24h) to "h:mm AM/PM" (12h display). */
export function formatTime12h(time24: string): string {
  const [h, m] = time24.split(":").map(Number);
  const period = h >= 12 ? "PM" : "AM";
  const displayH = h > 12 ? h - 12 : h === 0 ? 12 : h;
  return `${displayH}:${String(m).padStart(2, "0")} ${period}`;
}

// ─── Window Operations ─────────────────────────────────────────────────────────

export interface TimeWindow {
  start: string;
  end: string;
}

/**
 * Subtract a time range (blockStart–blockEnd) from an array of windows,
 * returning the remaining non-overlapping portions.
 */
export function subtractTimeRange(
  windows: TimeWindow[],
  blockStart: string,
  blockEnd: string
): TimeWindow[] {
  const result: TimeWindow[] = [];
  const bs = timeToMinutes(blockStart);
  const be = timeToMinutes(blockEnd);

  for (const w of windows) {
    const ws = timeToMinutes(w.start);
    const we = timeToMinutes(w.end);

    if (be <= ws || bs >= we) {
      // No overlap
      result.push(w);
    } else {
      // Partial overlap — keep the non-overlapping parts
      if (bs > ws) {
        result.push({ start: w.start, end: minutesToTime(Math.min(bs, we)) });
      }
      if (be < we) {
        result.push({ start: minutesToTime(Math.max(be, ws)), end: w.end });
      }
    }
  }

  return result;
}

/**
 * Merge overlapping or adjacent time windows into non-overlapping windows.
 * Input does not need to be sorted.
 */
export function mergeWindows(windows: TimeWindow[]): TimeWindow[] {
  if (windows.length === 0) return [];

  const sorted = [...windows].sort(
    (a, b) => timeToMinutes(a.start) - timeToMinutes(b.start)
  );

  const merged: TimeWindow[] = [sorted[0]];

  for (let i = 1; i < sorted.length; i++) {
    const last = merged[merged.length - 1];
    if (timeToMinutes(sorted[i].start) <= timeToMinutes(last.end)) {
      last.end =
        timeToMinutes(sorted[i].end) > timeToMinutes(last.end)
          ? sorted[i].end
          : last.end;
    } else {
      merged.push(sorted[i]);
    }
  }

  return merged;
}

/** Check if two time ranges overlap (open intervals: aS < bE && bS < aE). */
export function slotsOverlap(
  aStart: string,
  aEnd: string,
  bStart: string,
  bEnd: string
): boolean {
  const aS = timeToMinutes(aStart);
  const aE = timeToMinutes(aEnd);
  const bS = timeToMinutes(bStart);
  const bE = timeToMinutes(bEnd);
  return aS < bE && bS < aE;
}

// ─── Slot Generation ───────────────────────────────────────────────────────────

export interface Slot {
  start: string;
  end: string;
  employeeId?: string;
}

/**
 * Generate time slots of a fixed duration within a time window.
 * Slots start at `startTime` and step by `durationMinutes`.
 */
export function generateSlots(
  startTime: string,
  endTime: string,
  durationMinutes: number,
  employeeId?: string
): Slot[] {
  const slots: Slot[] = [];
  let current = timeToMinutes(startTime);
  const end = timeToMinutes(endTime);

  while (current + durationMinutes <= end) {
    const slot: Slot = {
      start: minutesToTime(current),
      end: minutesToTime(current + durationMinutes),
    };
    if (employeeId) slot.employeeId = employeeId;
    slots.push(slot);
    current += durationMinutes;
  }

  return slots;
}

/**
 * Generate 30-minute slot start times as strings (used by the legacy
 * available-slots endpoint for backward compatibility).
 */
export function generateSlotStrings(startTime: string, endTime: string): string[] {
  const slots: string[] = [];
  let totalMinutes = timeToMinutes(startTime);
  const endMinutes = timeToMinutes(endTime);

  while (totalMinutes + 30 <= endMinutes) {
    slots.push(minutesToTime(totalMinutes));
    totalMinutes += 30;
  }

  return slots;
}
