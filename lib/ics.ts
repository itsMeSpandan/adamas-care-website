/**
 * lib/ics.ts — minimal iCalendar (.ics) generator for booking emails.
 *
 * The salon operates in Asia/Kolkata (UTC+5:30): date + slot wall-times are
 * converted to UTC instants here so any calendar app worldwide shows the
 * correct moment.
 */

const SALON_TZ_OFFSET_MINUTES = 330; // Asia/Kolkata, UTC+5:30

interface IcsEventOptions {
  uid: string;
  title: string;
  description: string;
  location?: string;
  /** YYYY-MM-DD */
  date: string;
  /** "HH:MM" salon-local start */
  slotStart: string;
  /** "HH:MM" salon-local end (optional — falls back to +60 min) */
  slotEnd?: string;
}

function toUtcDate(date: string, time: string): Date {
  const [y, m, d] = date.split("-").map(Number);
  const [hh, mm] = (time || "00:00").split(":").map(Number);
  // Wall time in IST → UTC instant
  return new Date(Date.UTC(y, m - 1, d, hh, mm - SALON_TZ_OFFSET_MINUTES));
}

function formatIcsDate(d: Date): string {
  // YYYYMMDDTHHMMSSZ
  return d.toISOString().replace(/[-:]/g, "").replace(/\.\d{3}/, "");
}

function escapeIcsText(text: string): string {
  return text.replace(/\\/g, "\\\\").replace(/;/g, "\\;").replace(/,/g, "\\,").replace(/\r?\n/g, "\\n");
}

/** Build a VCALENDAR document with a single VEVENT. */
export function buildIcsCalendar(opts: IcsEventOptions): string {
  const start = toUtcDate(opts.date, opts.slotStart);
  let end: Date;
  if (opts.slotEnd && opts.slotEnd !== opts.slotStart) {
    end = toUtcDate(opts.date, opts.slotEnd);
  } else {
    end = new Date(start.getTime() + 60 * 60 * 1000);
  }
  if (end <= start) end = new Date(start.getTime() + 60 * 60 * 1000);

  const now = formatIcsDate(new Date());

  return [
    "BEGIN:VCALENDAR",
    "VERSION:2.0",
    "PRODID:-//Grace Salon//Booking//EN",
    "CALSCALE:GREGORIAN",
    "METHOD:PUBLISH",
    "BEGIN:VEVENT",
    `UID:${opts.uid}@gracesalon`,
    `DTSTAMP:${now}`,
    `DTSTART:${formatIcsDate(start)}`,
    `DTEND:${formatIcsDate(end)}`,
    `SUMMARY:${escapeIcsText(opts.title)}`,
    `DESCRIPTION:${escapeIcsText(opts.description)}`,
    opts.location ? `LOCATION:${escapeIcsText(opts.location)}` : "LOCATION:Grace Salon",
    "END:VEVENT",
    "END:VCALENDAR",
  ].join("\r\n");
}
