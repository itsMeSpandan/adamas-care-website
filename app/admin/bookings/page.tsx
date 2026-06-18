"use client";

import { useState, useEffect } from "react";
import { formatBookingDate } from "@/lib/utils";

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
  status: string;
  price: number;
  createdAt: string;
  service: { name: string; category: string };
  user: { name: string; email: string } | null;
}

const statusOptions = ["pending", "confirmed", "completed", "cancelled"] as const;

const statusColors: Record<string, string> = {
  confirmed: "bg-emerald-100 text-emerald-700 border-emerald-200",
  pending: "bg-amber-100 text-amber-700 border-amber-200",
  cancelled: "bg-red-100 text-red-700 border-red-200",
  completed: "bg-blue-100 text-blue-700 border-blue-200",
};

export default function AdminBookingsPage() {
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<string>("All");
  const [updatingId, setUpdatingId] = useState<string | null>(null);

  const fetchBookings = () => {
    fetch("/api/bookings")
      .then((res) => res.json())
      .then((data) => {
        setBookings(data.bookings || data || []);
        setLoading(false);
      })
      .catch(() => setLoading(false));
  };

  useEffect(() => {
    fetchBookings();
  }, []);

  const handleStatusChange = async (bookingId: string, newStatus: string) => {
    setUpdatingId(bookingId);
    try {
      const res = await fetch(`/api/bookings/${bookingId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: newStatus }),
      });
      if (res.ok) {
        setBookings((prev) =>
          prev.map((b) =>
            b.id === bookingId ? { ...b, status: newStatus } : b
          )
        );
      }
    } catch {
      // ignore
    } finally {
      setUpdatingId(null);
    }
  };

  const filtered = filter === "All" ? bookings : bookings.filter((b) => b.status === filter.toLowerCase());

  const counts = {
    All: bookings.length,
    Pending: bookings.filter((b) => b.status === "pending").length,
    Confirmed: bookings.filter((b) => b.status === "confirmed").length,
    Completed: bookings.filter((b) => b.status === "completed").length,
    Cancelled: bookings.filter((b) => b.status === "cancelled").length,
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="font-serif text-3xl font-semibold text-beige-700">
          Bookings
        </h1>
        <p className="mt-1 text-beige-600">Manage all appointments and update their status</p>
      </div>

      {/* Filter bar */}
      <div className="flex flex-wrap gap-2">
        {(["All", "Pending", "Confirmed", "Completed", "Cancelled"] as const).map((f) => (
          <button
            key={f}
            onClick={() => setFilter(f)}
            className={`flex items-center gap-2 rounded-full px-4 py-2 text-sm font-medium transition-all ${
              filter === f
                ? "bg-beige-600 text-white shadow-sm"
                : "border border-beige-300 bg-white text-beige-600 hover:bg-beige-50"
            }`}
          >
            {f}
            <span className={`inline-flex h-5 min-w-[20px] items-center justify-center rounded-full px-1.5 text-[10px] font-bold ${
              filter === f ? "bg-white/20 text-white" : "bg-beige-100 text-beige-500"
            }`}>
              {counts[f]}
            </span>
          </button>
        ))}
      </div>

      {/* Bookings table */}
      {loading ? (
        <div className="flex items-center justify-center py-12">
          <div className="h-8 w-8 animate-spin rounded-full border-2 border-beige-300 border-t-beige-600" />
        </div>
      ) : (
        <div className="rounded-card border border-beige-200 bg-white shadow-card">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-beige-100 text-left text-xs font-medium uppercase tracking-wider text-beige-400">
                  <th className="px-6 py-3">Client</th>
                  <th className="px-6 py-3">Service</th>
                  <th className="px-6 py-3 hidden sm:table-cell">Date & Time</th>
                  <th className="px-6 py-3 hidden md:table-cell">Price</th>
                  <th className="px-6 py-3">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-beige-50">
                {filtered.map((booking) => (
                  <tr key={booking.id} className="transition-colors hover:bg-beige-50">
                    <td className="px-6 py-4">
                      <div>
                        <p className="font-medium text-beige-700">{booking.name}</p>
                        <p className="text-xs text-beige-400">{booking.email}</p>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <p className="text-beige-700">{booking.service?.name}</p>
                      <p className="text-xs text-beige-400 sm:hidden">
                        {formatBookingDate(booking.date)} &middot; {booking.timeSlot}
                      </p>
                    </td>
                    <td className="px-6 py-4 text-beige-600 hidden sm:table-cell">
                      {new Date(booking.date).toLocaleDateString()} &middot; {booking.timeSlot}
                    </td>
                    <td className="px-6 py-4 text-beige-600 hidden md:table-cell">
                      ₹{booking.price}
                    </td>
                    <td className="px-6 py-4">
                      <div className="relative">
                        <select
                          value={booking.status}
                          onChange={(e) => handleStatusChange(booking.id, e.target.value)}
                          disabled={updatingId === booking.id}
                          className={`appearance-none cursor-pointer rounded-full border px-3 py-1.5 pr-8 text-xs font-medium transition-all focus:outline-none focus:ring-2 focus:ring-beige-400 ${
                            statusColors[booking.status] || "bg-beige-100 text-beige-600 border-beige-200"
                          } ${updatingId === booking.id ? "opacity-50" : ""}`}
                        >
                          {statusOptions.map((s) => (
                            <option key={s} value={s}>
                              {s.charAt(0).toUpperCase() + s.slice(1)}
                            </option>
                          ))}
                        </select>
                        <div className="pointer-events-none absolute right-2 top-1/2 -translate-y-1/2">
                          <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                            <polyline points="6 9 12 15 18 9" />
                          </svg>
                        </div>
                      </div>
                      {updatingId === booking.id && (
                        <div className="mt-1 flex items-center gap-1">
                          <div className="h-3 w-3 animate-spin rounded-full border border-beige-300 border-t-beige-600" />
                          <span className="text-[10px] text-beige-400">Saving...</span>
                        </div>
                      )}
                    </td>
                  </tr>
                ))}
                {filtered.length === 0 && (
                  <tr>
                    <td colSpan={5} className="px-6 py-12 text-center text-beige-400">
                      No bookings match the selected filter.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
