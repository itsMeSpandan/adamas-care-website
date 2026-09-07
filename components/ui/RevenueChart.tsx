"use client";

import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from "recharts";

interface MonthData {
  label: string;
  shortLabel: string;
  revenue: number;
  prevRevenue: number;
}

interface RevenueChartProps {
  data: MonthData[];
  totalRevenue: number;
}

function formatCurrency(value: number): string {
  if (value >= 100000) return `₹${(value / 100000).toFixed(1)}L`;
  if (value >= 1000) return `₹${(value / 1000).toFixed(1)}K`;
  return `₹${value.toLocaleString()}`;
}

interface TooltipPayloadEntry {
  dataKey: string;
  name: string;
  color: string;
  value: number;
}

function CustomTooltip({ active, payload, label }: {
  active?: boolean;
  payload?: TooltipPayloadEntry[];
  label?: string;
}) {
  if (!active || !payload || payload.length === 0) return null;
  return (
    <div className="rounded-lg border border-beige-200 bg-white px-4 py-3 shadow-lg">
      <p className="mb-1 text-xs font-semibold text-beige-700">{label}</p>
      {payload.map((entry: TooltipPayloadEntry) => (
        <div key={entry.dataKey} className="flex items-center gap-2 text-xs">
          <span
            className="inline-block h-2 w-2 rounded-full"
            style={{ backgroundColor: entry.color }}
          />
          <span className="text-beige-500">{entry.name}:</span>
          <span className="font-medium text-beige-700">
            ₹{entry.value.toLocaleString()}
          </span>
        </div>
      ))}
    </div>
  );
}

export default function RevenueChart({ data, totalRevenue }: RevenueChartProps) {
  const hasData = data.some((d) => d.revenue > 0);

  const chartData = data.map((d) => ({
    name: d.shortLabel,
    label: d.label,
    "This Month": d.revenue,
    "Prev Month": d.prevRevenue,
  }));

  return (
    <div className="flex h-full flex-col">
      <div className="flex-1 min-h-0">
        {!hasData ? (
          <div className="flex h-full items-center justify-center">
            <p className="text-sm text-beige-400">No revenue data yet</p>
          </div>
        ) : (
          <ResponsiveContainer width="100%" height="100%">
            <BarChart
              data={chartData}
              margin={{ top: 8, right: 8, left: 0, bottom: 0 }}
              barGap={2}
            >
              <CartesianGrid
                strokeDasharray="3 3"
                stroke="#e8e0d8"
                vertical={false}
              />
              <XAxis
                dataKey="name"
                tick={{ fontSize: 11, fill: "#a09080" }}
                tickLine={false}
                axisLine={{ stroke: "#e8e0d8" }}
              />
              <YAxis
                tick={{ fontSize: 10, fill: "#a09080" }}
                tickLine={false}
                axisLine={false}
                tickFormatter={formatCurrency}
                width={50}
              />
              <Tooltip content={<CustomTooltip />} />
              <Legend
                iconType="circle"
                iconSize={8}
                wrapperStyle={{ fontSize: 11, paddingTop: 8 }}
              />
              <Bar
                dataKey="This Month"
                fill="#d4a574"
                radius={[4, 4, 0, 0]}
                maxBarSize={32}
              />
              <Bar
                dataKey="Prev Month"
                fill="#e8ddd3"
                radius={[4, 4, 0, 0]}
                maxBarSize={32}
              />
            </BarChart>
          </ResponsiveContainer>
        )}
      </div>

      {/* Summary line */}
      <div className="mt-2 flex items-center justify-between border-t border-beige-100 pt-3">
        <span className="text-sm text-beige-500">Total Revenue</span>
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-1.5">
            <span className="h-2 w-2 rounded-full bg-[#d4a574]" />
            <span className="text-[10px] text-beige-400">This month</span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="h-2 w-2 rounded-full bg-[#e8ddd3]" />
            <span className="text-[10px] text-beige-400">Prev month</span>
          </div>
          <span className="text-lg font-bold text-beige-700">
            ₹{totalRevenue.toLocaleString()}
          </span>
        </div>
      </div>
    </div>
  );
}
