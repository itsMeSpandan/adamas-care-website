"use client";

import { useState, useMemo } from "react";
import EmployeeEarningsChart from "@/components/ui/EmployeeEarningsChart";

interface BookingEmployee {
  id: string;
  name: string;
  gender?: string;
}

interface Booking {
  id: string;
  price: number;
  date: string;
  employee: BookingEmployee | null;
  status: string;
}

interface EmployeeEarningsSectionProps {
  completedBookings: Booking[];
}

interface EarningEntry {
  name: string;
  gender?: string;
  earnings: number;
  bookings: number;
}

function getMonthKey(date: Date): string {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}`;
}

function formatMonth(year: number, month: number): string {
  return new Date(year, month, 1).toLocaleDateString("en-US", {
    month: "long",
    year: "numeric",
  });
}

export default function EmployeeEarningsSection({
  completedBookings,
}: EmployeeEarningsSectionProps) {
  const [downloading, setDownloading] = useState(false);

  const downloadReport = async () => {
    if (!selectedMonth) return;
    setDownloading(true);
    try {
      const monthKey = `${selectedMonth.year}-${String(selectedMonth.month + 1).padStart(2, "0")}`;
      const res = await fetch(`/api/admin/reports?month=${monthKey}`);
      if (!res.ok) throw new Error("Failed to download");
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `revenue-report-${monthKey}.csv`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    } catch {
      // silently fail
    } finally {
      setDownloading(false);
    }
  };
  // Find the range of months that have data
  const monthRange = useMemo(() => {
    const now = new Date();
    const currentYear = now.getFullYear();
    const currentMonth = now.getMonth();

    // Find the earliest month with bookings
    let earliestYear = currentYear;
    let earliestMonth = currentMonth;
    for (const b of completedBookings) {
      const d = new Date(b.date);
      const key = getMonthKey(d);
      const currentEarliest = getMonthKey(new Date(earliestYear, earliestMonth, 1));
      if (key < currentEarliest) {
        earliestYear = d.getFullYear();
        earliestMonth = d.getMonth();
      }
    }

    // Build list of months from earliest to now
    const months: { year: number; month: number; key: string; label: string }[] = [];
    let y = earliestYear;
    let m = earliestMonth;
    while (y < currentYear || (y === currentYear && m <= currentMonth)) {
      months.push({
        year: y,
        month: m,
        key: getMonthKey(new Date(y, m, 1)),
        label: formatMonth(y, m),
      });
      m++;
      if (m > 11) {
        m = 0;
        y++;
      }
    }
    return months.reverse(); // Most recent first
  }, [completedBookings]);

  const [selectedIndex, setSelectedIndex] = useState(0); // 0 = current month

  const selectedMonth = monthRange[selectedIndex];
  const hasData = monthRange.length > 0;

  // Filter bookings for selected month
  const monthEarnings = useMemo(() => {
    if (!selectedMonth) return [];
    const earningsMap = new Map<string, EarningEntry>();
    for (const b of completedBookings) {
      const d = new Date(b.date);
      if (
        d.getFullYear() !== selectedMonth.year ||
        d.getMonth() !== selectedMonth.month
      )
        continue;
      if (!b.employee) continue;
      const empId = b.employee.id;
      const existing = earningsMap.get(empId);
      if (existing) {
        existing.earnings += b.price;
        existing.bookings += 1;
      } else {
        earningsMap.set(empId, {
          name: b.employee.name,
          gender: b.employee.gender,
          earnings: b.price,
          bookings: 1,
        });
      }
    }
    return Array.from(earningsMap.values()).sort(
      (a, b) => b.earnings - a.earnings
    );
  }, [completedBookings, selectedMonth]);

  const totalMonthEarnings = monthEarnings.reduce(
    (sum, e) => sum + e.earnings,
    0
  );
  const totalMonthBookings = monthEarnings.reduce(
    (sum, e) => sum + e.bookings,
    0
  );

  const goPrev = () => {
    if (selectedIndex < monthRange.length - 1) {
      setSelectedIndex(selectedIndex + 1);
    }
  };

  const goNext = () => {
    if (selectedIndex > 0) {
      setSelectedIndex(selectedIndex - 1);
    }
  };

  if (!hasData) {
    return (
      <div className="grid gap-6 lg:grid-cols-2">
        <div className="rounded-card border border-beige-200 bg-white p-6 shadow-card">
          <h2 className="mb-4 font-serif text-lg font-semibold text-beige-700">
            Employee Earnings
          </h2>
          <div className="flex h-64 items-center justify-center">
            <p className="text-sm text-beige-400">
              No booking data available yet.
            </p>
          </div>
        </div>
        <div className="rounded-card border border-beige-200 bg-white p-6 shadow-card">
          <h2 className="mb-4 font-serif text-lg font-semibold text-beige-700">
            Earnings Breakdown
          </h2>
          <div className="flex h-64 items-center justify-center">
            <p className="text-sm text-beige-400">
              No booking data available yet.
            </p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="grid gap-6 lg:grid-cols-2">
      {/* Chart card */}
      <div className="rounded-card border border-beige-200 bg-white p-6 shadow-card">
        <div className="mb-4 flex items-center justify-between">
          <h2 className="font-serif text-lg font-semibold text-beige-700">
            Employee Earnings
          </h2>
          <div className="flex items-center gap-2">
            {/* Download report button */}
            <button
              onClick={downloadReport}
              disabled={downloading}
              className="flex items-center gap-1.5 rounded-lg border border-beige-200 bg-white px-2.5 py-1.5 text-[11px] font-medium text-beige-600 transition-colors hover:bg-beige-50 hover:text-beige-700 disabled:opacity-50"
              title="Download monthly revenue report"
            >
              <svg
                width="12"
                height="12"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
                <polyline points="7 10 12 15 17 10" />
                <line x1="12" x2="12" y1="15" y2="3" />
              </svg>
              {downloading ? "Downloading..." : "Export CSV"}
            </button>
            {/* Month navigator */}
            <div className="flex items-center gap-1">
            <button
              onClick={goPrev}
              disabled={selectedIndex >= monthRange.length - 1}
              className="flex h-7 w-7 items-center justify-center rounded-lg border border-beige-200 text-beige-500 transition-colors hover:bg-beige-100 hover:text-beige-700 disabled:cursor-not-allowed disabled:opacity-30"
              aria-label="Previous month"
            >
              <svg
                width="14"
                height="14"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <polyline points="15 18 9 12 15 6" />
              </svg>
            </button>
            <span className="min-w-[120px] text-center text-xs font-medium text-beige-600">
              {selectedMonth.label}
            </span>
            <button
              onClick={goNext}
              disabled={selectedIndex <= 0}
              className="flex h-7 w-7 items-center justify-center rounded-lg border border-beige-200 text-beige-500 transition-colors hover:bg-beige-100 hover:text-beige-700 disabled:cursor-not-allowed disabled:opacity-30"
              aria-label="Next month"
            >
              <svg
                width="14"
                height="14"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <polyline points="9 18 15 12 9 6" />
              </svg>
            </button>
          </div>
          </div>
        </div>

        {/* Month summary */}
        <div className="mb-3 flex items-center gap-4 text-xs text-beige-500">
          <span>
            Total:{" "}
            <span className="font-semibold text-beige-700">
              ₹{totalMonthEarnings.toLocaleString()}
            </span>
          </span>
          <span>
            Bookings:{" "}
            <span className="font-semibold text-beige-700">
              {totalMonthBookings}
            </span>
          </span>
        </div>

        <div className="h-64">
          <EmployeeEarningsChart data={monthEarnings} />
        </div>
      </div>

      {/* Table card */}
      <div className="rounded-card border border-beige-200 bg-white p-6 shadow-card">
        <div className="mb-4 flex items-center justify-between">
          <h2 className="font-serif text-lg font-semibold text-beige-700">
            Earnings Breakdown
          </h2>
          <span className="text-xs text-beige-400">
            {selectedMonth.label}
          </span>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-beige-100 text-left text-xs font-medium uppercase tracking-wider text-beige-400">
                <th className="pb-2">Employee</th>
                <th className="pb-2 text-right">Bookings</th>
                <th className="pb-2 text-right">Earnings</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-beige-50">
              {monthEarnings.map((emp) => (
                <tr
                  key={emp.name}
                  className="transition-colors hover:bg-beige-50"
                >
                  <td className="py-2.5">
                    <div className="flex items-center gap-2">
                      <span className="font-medium text-beige-700">
                        {emp.name}
                      </span>
                      {emp.gender && (
                        <span
                          className={`inline-block rounded-full px-1.5 py-0.5 text-[9px] font-medium capitalize ${
                            emp.gender === "male"
                              ? "bg-blue-50 text-blue-600"
                              : emp.gender === "female"
                              ? "bg-amber-50 text-amber-600"
                              : "bg-green-50 text-green-600"
                          }`}
                        >
                          {emp.gender}
                        </span>
                      )}
                    </div>
                  </td>
                  <td className="py-2.5 text-right text-beige-600">
                    {emp.bookings}
                  </td>
                  <td className="py-2.5 text-right font-medium text-beige-700">
                    ₹{emp.earnings.toLocaleString()}
                  </td>
                </tr>
              ))}
              {monthEarnings.length === 0 && (
                <tr>
                  <td colSpan={3} className="py-8 text-center text-beige-400">
                    No employee earnings for this month.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        {/* Quick month pills */}
        {monthRange.length > 1 && (
          <div className="mt-4 flex flex-wrap gap-1.5 border-t border-beige-100 pt-3">
            {monthRange.slice(0, 6).map((m, i) => (
              <button
                key={m.key}
                onClick={() => setSelectedIndex(i)}
                className={`rounded-full px-2.5 py-1 text-[10px] font-medium transition-all ${
                  selectedIndex === i
                    ? "border border-beige-600 bg-beige-600 text-white"
                    : "border border-beige-200 bg-white text-beige-500 hover:border-beige-300 hover:text-beige-700"
                }`}
              >
                {new Date(m.year, m.month, 1).toLocaleDateString("en-US", {
                  month: "short",
                })}
              </button>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
