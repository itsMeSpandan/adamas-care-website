"use client";

import { useState, useEffect } from "react";
import Image from "next/image";
import { useAuth } from "@/lib/auth-context";
import WeeklyTimetable from "@/components/ui/WeeklyTimetable";

interface EmployeeData {
  id: string;
  name: string;
  role: string;
  imageUrl: string;
  rating: number;
  reviewCount: number;
}

interface BookingWithService {
  id: string;
  employeeId: string;
  status: string;
  rating: number | null;
  review: string | null;
  service: { name: string };
  name: string;
  date: string;
}

export default function EmployeePage() {
  const { user } = useAuth();
  const [employeeData, setEmployeeData] = useState<EmployeeData | null>(null);
  const [ratings, setRatings] = useState<BookingWithService[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user?.employeeId) {
      setLoading(false);
      return;
    }

    const empId = user.employeeId;

    async function fetchData() {
      try {
        const [empRes, bookingsRes] = await Promise.all([
          fetch(`/api/employees/${empId}`),
          fetch("/api/bookings"),
        ]);

        if (empRes.ok) {
          const emp = await empRes.json();
          setEmployeeData(emp);
        }

        if (bookingsRes.ok) {
          const bookingsData = await bookingsRes.json();
          const bookings = (bookingsData.bookings || bookingsData || []) as BookingWithService[];
          const myRated = bookings.filter(
            (b) => b.employeeId === empId && b.status === "completed" && b.rating != null
          );
          setRatings(myRated);
        }
      } catch {
        // silently fail
      } finally {
        setLoading(false);
      }
    }

    fetchData();
  }, [user]);

  if (!user?.employeeId) {
    return (
      <div className="section-padding bg-beige-50">
        <div className="section-container mx-auto max-w-3xl text-center">
          <h1 className="mb-4 font-serif text-3xl font-semibold text-beige-700">Employee Dashboard</h1>
          <p className="text-beige-600">Your account is not linked to an employee profile. Please contact an administrator.</p>
        </div>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-beige-300 border-t-beige-600" />
      </div>
    );
  }

  const avgRating =
    ratings.length > 0
      ? (ratings.reduce((sum, b) => sum + (b.rating ?? 0), 0) / ratings.length).toFixed(1)
      : "0.0";

  return (
    <div className="space-y-8">
      {/* Header */}
      <div>
        <h1 className="font-serif text-3xl font-semibold text-beige-700">
          Employee Dashboard
        </h1>
        <p className="mt-1 text-beige-600">
          Welcome back, {user.name}. Here&apos;s your overview.
        </p>
      </div>

      {/* Profile & Rating Card */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        <div className="rounded-card border border-beige-200 bg-white p-6 shadow-card sm:col-span-2 lg:col-span-1">
          <div className="flex items-center gap-4">
            {employeeData && (
              <div className="relative h-16 w-16 overflow-hidden rounded-full">
                <Image
                  src={employeeData.imageUrl}
                  alt={employeeData.name}
                  fill
                  className="object-cover"
                  sizes="64px"
                />
              </div>
            )}
            <div>
              <p className="text-lg font-semibold text-beige-700">{employeeData?.name || user.name}</p>
              <p className="text-sm text-beige-500">{employeeData?.role}</p>
            </div>
          </div>
        </div>

        <div className="rounded-card border border-beige-200 bg-white p-6 shadow-card">
          <p className="text-sm text-beige-500">Average Rating</p>
          <div className="mt-1 flex items-baseline gap-2">
            <span className="text-3xl font-bold text-beige-700">{avgRating}</span>
            <span className="text-sm text-beige-400">/ 5.0</span>
          </div>
          <div className="mt-2 h-2 overflow-hidden rounded-full bg-beige-100">
            <div
              className="h-full rounded-full bg-amber-400 transition-all"
              style={{ width: `${(parseFloat(avgRating) / 5) * 100}%` }}
            />
          </div>
        </div>

        <div className="rounded-card border border-beige-200 bg-white p-6 shadow-card">
          <p className="text-sm text-beige-500">Total Reviews</p>
          <span className="mt-1 block text-3xl font-bold text-beige-700">{ratings.length}</span>
          <p className="mt-1 text-xs text-beige-400">Completed bookings with ratings</p>
        </div>
      </div>

      {/* Recent Reviews */}
      <div className="rounded-card border border-beige-200 bg-white shadow-card">
        <div className="border-b border-beige-100 px-6 py-4">
          <h2 className="font-serif text-lg font-semibold text-beige-700">
            Recent Reviews
          </h2>
        </div>
        {ratings.length > 0 ? (
          <div className="divide-y divide-beige-100">
            {ratings.slice(0, 10).map((r) => (
              <div key={r.id} className="px-6 py-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-beige-700">{r.service?.name}</p>
                    <p className="text-xs text-beige-500">Client: {r.name}</p>
                  </div>
                  <div className="text-right">
                    <div className="flex items-center gap-1">
                      {Array.from({ length: 5 }).map((_, i) => (
                        <svg
                          key={i}
                          width="12"
                          height="12"
                          viewBox="0 0 24 24"
                          fill={i < (r.rating ?? 0) ? "currentColor" : "none"}
                          stroke="currentColor"
                          strokeWidth="2"
                          className={i < (r.rating ?? 0) ? "text-amber-400" : "text-beige-300"}
                        >
                          <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2" />
                        </svg>
                      ))}
                    </div>
                    {r.review && (
                      <p className="mt-1 text-xs text-beige-500 max-w-xs italic">&ldquo;{r.review}&rdquo;</p>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="px-6 py-12 text-center">
            <p className="text-beige-400">No reviews yet. Reviews will appear after completed bookings.</p>
          </div>
        )}
      </div>

      {/* Weekly Timetable — new availability-aware version */}
      <WeeklyTimetable employeeId={user.employeeId} />
    </div>
  );
}
