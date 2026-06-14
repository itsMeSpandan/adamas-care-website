import type { Metadata } from "next";
import { BRAND } from "@/lib/brand";
import { getBookings, getServices } from "@/lib/queries";
import { formatPrice } from "@/lib/utils";
import { db } from "@/lib/db";
import RevenueChart from "@/components/ui/RevenueChart";

export const metadata: Metadata = {
  title: `Admin Dashboard | ${BRAND.name}`,
};

export const dynamic = "force-dynamic";

export default async function AdminPage() {
  // Fetch real data from database
  const [bookings, services, totalClients, adminUser] = await Promise.all([
    getBookings(),
    getServices(),
    db.user.count({ where: { role: "user" } }),
    db.user.findFirst({ where: { role: "admin" }, select: { name: true } }),
  ]);

  // Calculate real stats from completed bookings only
  const totalBookings = bookings.length;
  const completedBookings = bookings.filter((b) => b.status === "completed");
  const totalRevenue = completedBookings.reduce((sum, b) => sum + b.price, 0);

  // Calculate average rating from completed bookings that have ratings
  const ratedBookings = completedBookings.filter((b) => b.rating != null);
  const avgRating = ratedBookings.length > 0
    ? (ratedBookings.reduce((sum, b) => sum + (b.rating ?? 0), 0) / ratedBookings.length).toFixed(1)
    : "0.0";

  // Current date reference (used for month comparisons and chart aggregation)
  const now = new Date();

  // Month-over-month comparison (current month vs previous month)
  const currentMonth = now.getMonth();
  const currentYear = now.getFullYear();
  const thisMonthBookings = completedBookings.filter((b) => {
    const bd = new Date(b.date);
    return bd.getMonth() === currentMonth && bd.getFullYear() === currentYear;
  });
  const lastMonthBookings = completedBookings.filter((b) => {
    const bd = new Date(b.date);
    const prev = new Date(currentYear, currentMonth - 1, 1);
    return bd.getMonth() === prev.getMonth() && bd.getFullYear() === prev.getFullYear();
  });
  const thisMonthRevenue = thisMonthBookings.reduce((s, b) => s + b.price, 0);
  const lastMonthRevenue = lastMonthBookings.reduce((s, b) => s + b.price, 0);
  const thisMonthRatings = thisMonthBookings.filter((b) => b.rating != null);
  const lastMonthRatings = lastMonthBookings.filter((b) => b.rating != null);

  const revenueChange = lastMonthRevenue > 0
    ? Math.round(((thisMonthRevenue - lastMonthRevenue) / lastMonthRevenue) * 100)
    : thisMonthRevenue > 0 ? 100 : 0;
  const bookingsChange = lastMonthBookings.length > 0
    ? Math.round(((thisMonthBookings.length - lastMonthBookings.length) / lastMonthBookings.length) * 100)
    : thisMonthBookings.length > 0 ? 100 : 0;
  const ratingChange = lastMonthRatings.length > 0 && thisMonthRatings.length > 0
    ? (() => {
        const prevAvg = lastMonthRatings.reduce((s, b) => s + (b.rating ?? 0), 0) / lastMonthRatings.length;
        const thisAvg = thisMonthRatings.reduce((s, b) => s + (b.rating ?? 0), 0) / thisMonthRatings.length;
        return Math.round(((thisAvg - prevAvg) / prevAvg) * 100);
      })()
    : 0;

  const stats = [
    { label: "Total Bookings", value: totalBookings.toString(), change: bookingsChange !== 0 ? `${bookingsChange > 0 ? "+" : ""}${bookingsChange}% vs last month` : "", up: bookingsChange >= 0 },
    { label: "Revenue", value: `$${totalRevenue.toLocaleString()}`, change: revenueChange !== 0 ? `${revenueChange > 0 ? "+" : ""}${revenueChange}% vs last month` : "", up: revenueChange >= 0 },
    { label: "New Clients", value: totalClients.toString(), change: "", up: true },
    { label: "Avg. Rating", value: avgRating, change: ratedBookings.length > 0 ? `from ${ratedBookings.length} reviews${ratingChange !== 0 ? ` · ${ratingChange > 0 ? "+" : ""}${ratingChange}% vs last month` : ""}` : "", up: ratingChange >= 0 },
  ];

  // Recent bookings from database
  const recentBookings = bookings.slice(0, 5);

  // Popular services from database (based on completed bookings)
  const popularServices = services
    .filter((s) => s.featured)
    .slice(0, 5)
    .map((s) => ({
      name: s.name,
      bookings: completedBookings.filter((b) => b.serviceId === s.id).length,
      revenue: formatPrice(completedBookings.filter((b) => b.serviceId === s.id).reduce((sum, b) => sum + b.price, 0)),
    }));

  const statusColors: Record<string, string> = {
    confirmed: "bg-emerald-100 text-emerald-700",
    pending: "bg-amber-100 text-amber-700",
    cancelled: "bg-red-100 text-red-700",
    completed: "bg-blue-100 text-blue-700",
  };

  // Aggregate revenue by month from completed bookings (last 12 months)
  const months: { label: string; shortLabel: string; revenue: number; prevRevenue: number }[] = [];
  for (let i = 11; i >= 0; i--) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
    const year = d.getFullYear();
    const month = d.getMonth();
    const label = d.toLocaleDateString("en-US", { month: "long", year: "numeric" });
    const shortLabel = d.toLocaleDateString("en-US", { month: "short" });
    const revenue = completedBookings
      .filter((b) => {
        const bd = new Date(b.date);
        return bd.getFullYear() === year && bd.getMonth() === month;
      })
      .reduce((sum, b) => sum + b.price, 0);
    // Previous month for comparison
    const prevD = new Date(now.getFullYear(), now.getMonth() - i - 1, 1);
    const prevYear = prevD.getFullYear();
    const prevMonth = prevD.getMonth();
    const prevRevenue = completedBookings
      .filter((b) => {
        const bd = new Date(b.date);
        return bd.getFullYear() === prevYear && bd.getMonth() === prevMonth;
      })
      .reduce((sum, b) => sum + b.price, 0);
    months.push({ label, shortLabel, revenue, prevRevenue });
  }

  return (
    <div className="space-y-8">
      {/* Header */}
      <div>
        <h1 className="font-serif text-3xl font-semibold text-beige-700">
          Analytics Dashboard
        </h1>
        <p className="mt-1 text-beige-600">
          Welcome back, {adminUser?.name?.split(" ")[0] || "Admin"}. Here&apos;s your salon overview.
        </p>
      </div>

      {/* Stats cards */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {stats.map((stat) => (
          <div
            key={stat.label}
            className="rounded-card border border-beige-200 bg-white p-5 shadow-card"
          >
            <p className="text-sm text-beige-500">{stat.label}</p>
            <div className="mt-1 flex items-baseline gap-2">
              <span className="text-2xl font-bold text-beige-700">{stat.value}</span>
              {stat.change && (
                <span className={`text-xs font-medium ${stat.up ? "text-emerald-600" : "text-red-600"}`}>
                  {stat.change}
                </span>
              )}
            </div>
          </div>
        ))}
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        {/* Real revenue chart */}
        <div className="rounded-card border border-beige-200 bg-white p-6 shadow-card lg:col-span-2">
          <h2 className="mb-4 font-serif text-lg font-semibold text-beige-700">
            Revenue Overview
          </h2>
          <div className="h-64">
            <RevenueChart data={months} totalRevenue={totalRevenue} />
          </div>
        </div>

        {/* Popular services */}
        <div className="rounded-card border border-beige-200 bg-white p-6 shadow-card">
          <h2 className="mb-4 font-serif text-lg font-semibold text-beige-700">
            Top Services
          </h2>
          <div className="space-y-4">
            {popularServices.map((svc, i) => (
              <div key={svc.name} className="flex items-center gap-3">
                <span className="flex h-7 w-7 flex-shrink-0 items-center justify-center rounded-full bg-beige-100 text-xs font-bold text-beige-600">
                  {i + 1}
                </span>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-medium text-beige-700">{svc.name}</p>
                  <p className="text-xs text-beige-500">
                    {svc.bookings} bookings · {svc.revenue}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Recent bookings */}
      <div className="rounded-card border border-beige-200 bg-white shadow-card">
        <div className="border-b border-beige-100 px-6 py-4">
          <h2 className="font-serif text-lg font-semibold text-beige-700">
            Recent Bookings
          </h2>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-beige-100 text-left text-xs font-medium uppercase tracking-wider text-beige-400">
                <th className="px-6 py-3">Client</th>
                <th className="px-6 py-3">Service</th>
                <th className="px-6 py-3">Date</th>
                <th className="px-6 py-3">Time</th>
                <th className="px-6 py-3">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-beige-50">
              {recentBookings.map((booking) => (
                <tr key={booking.id} className="transition-colors hover:bg-beige-50">
                  <td className="px-6 py-4 font-medium text-beige-700">{booking.name}</td>
                  <td className="px-6 py-4 text-beige-600">{booking.service.name}</td>
                  <td className="px-6 py-4 text-beige-600">
                    {booking.date.toLocaleDateString()}
                  </td>
                  <td className="px-6 py-4 text-beige-600">{booking.timeSlot}</td>
                  <td className="px-6 py-4">
                    <span className={`inline-block rounded-full px-2.5 py-0.5 text-xs font-medium ${statusColors[booking.status] ?? "bg-beige-100 text-beige-600"}`}>
                      {booking.status}
                    </span>
                  </td>
                </tr>
              ))}
              {recentBookings.length === 0 && (
                <tr>
                  <td colSpan={5} className="px-6 py-12 text-center text-beige-400">
                    No bookings yet. Data will appear here once customers start booking.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

    </div>
  );
}
