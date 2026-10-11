import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function formatPrice(price: number): string {
  return new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
    minimumFractionDigits: 0,
  }).format(price);
}

export function formatDuration(minutes: number): string {
  if (minutes < 60) return `${minutes} min`;
  const hours = Math.floor(minutes / 60);
  const remaining = minutes % 60;
  if (remaining === 0) return `${hours} hr`;
  return `${hours} hr ${remaining} min`;
}

export function displayTime(time: string): string {
  const [h, m] = time.split(":").map(Number);
  const period = h >= 12 ? "PM" : "AM";
  const displayH = h > 12 ? h - 12 : h === 0 ? 12 : h;
  return `${displayH}:${m.toString().padStart(2, "0")} ${period}`;
}

/** Extract YYYY-MM-DD from an ISO date string without timezone conversion. */
export function parseDateKey(iso: string): string {
  return iso.split("T")[0];
}

/** Format a booking date for display without timezone shift (uses the raw date part). */
export function formatBookingDate(iso: string): string {
  const [y, m, d] = iso.split("T")[0].split("-");
  const date = new Date(Number(y), Number(m) - 1, Number(d));
  return date.toLocaleDateString("en-US", {
    weekday: "short",
    month: "short",
    day: "numeric",
  });
}

/** Format a loyalty reward discount for display. */
export function formatDiscount(type: string, value: number): string {
  if (type === "percent") return `${value}% off`;
  if (type === "fixed") return `\u20B9${value} off`;
  if (type === "free_service") return "Free service";
  return `${value} off`;
}

/** Get all services associated with a booking, accounting for both multi-service junction rows and legacy single serviceId. */
export function getBookingServices<T extends { name: string }>(booking: {
  service?: T | null;
  bookingServices?: { service: T }[];
}): T[] {
  if (booking.bookingServices && booking.bookingServices.length > 0) {
    return booking.bookingServices.map((bs) => bs.service);
  }
  return booking.service ? [booking.service] : [];
}

/** Format all service names of a booking into a comma-separated string. */
export function formatServiceNames(booking: {
  service?: { name: string } | null;
  bookingServices?: { service: { name: string } }[];
}): string {
  const services = getBookingServices(booking);
  if (services.length === 0) return "—";
  return services.map((s) => s.name).join(", ");
}


