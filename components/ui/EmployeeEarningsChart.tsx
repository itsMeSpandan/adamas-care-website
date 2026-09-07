"use client";

import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Cell,
} from "recharts";

interface EmployeeEarning {
  name: string;
  gender?: string;
  earnings: number;
  bookings: number;
}

interface EmployeeEarningsChartProps {
  data: EmployeeEarning[];
}

const GENDER_COLORS: Record<string, string> = {
  male: "#6b9bd2",
  female: "#d4a574",
  other: "#a8b5a0",
};

const DEFAULT_COLOR = "#c9b8a8";

function formatCurrency(value: number): string {
  if (value >= 100000) return `₹${(value / 100000).toFixed(1)}L`;
  if (value >= 1000) return `₹${(value / 1000).toFixed(1)}K`;
  return `₹${value.toLocaleString()}`;
}

interface TooltipPayloadEntry {
  payload: {
    name: string;
    earnings: number;
    bookings: number;
    gender?: string;
  };
}

function CustomTooltip({ active, payload }: {
  active?: boolean;
  payload?: TooltipPayloadEntry[];
}) {
  if (!active || !payload || payload.length === 0) return null;
  const data = payload[0]?.payload;
  if (!data) return null;
  return (
    <div className="rounded-lg border border-beige-200 bg-white px-4 py-3 shadow-lg">
      <p className="mb-1 text-xs font-semibold text-beige-700">{data.name}</p>
      <div className="flex items-center gap-2 text-xs">
        <span className="text-beige-500">Earnings:</span>
        <span className="font-medium text-beige-700">
          ₹{data.earnings.toLocaleString()}
        </span>
      </div>
      <div className="flex items-center gap-2 text-xs">
        <span className="text-beige-500">Bookings:</span>
        <span className="font-medium text-beige-700">{data.bookings}</span>
      </div>
      {data.gender && (
        <div className="flex items-center gap-2 text-xs">
          <span className="text-beige-500">Gender:</span>
          <span className="font-medium capitalize text-beige-700">
            {data.gender}
          </span>
        </div>
      )}
    </div>
  );
}

export default function EmployeeEarningsChart({
  data,
}: EmployeeEarningsChartProps) {
  const hasData = data.length > 0 && data.some((d) => d.earnings > 0);

  const chartData = data.map((d) => ({
    name: d.name.length > 12 ? d.name.slice(0, 12) + "…" : d.name,
    fullName: d.name,
    earnings: d.earnings,
    bookings: d.bookings,
    gender: d.gender,
  }));

  return (
    <div className="flex h-full flex-col">
      <div className="flex-1 min-h-0">
        {!hasData ? (
          <div className="flex h-full items-center justify-center">
            <p className="text-sm text-beige-400">
              No employee earnings data yet
            </p>
          </div>
        ) : (
          <ResponsiveContainer width="100%" height="100%">
            <BarChart
              data={chartData}
              margin={{ top: 8, right: 8, left: 0, bottom: 0 }}
              layout="vertical"
            >
              <CartesianGrid
                strokeDasharray="3 3"
                stroke="#e8e0d8"
                horizontal={false}
              />
              <XAxis
                type="number"
                tick={{ fontSize: 10, fill: "#a09080" }}
                tickLine={false}
                axisLine={false}
                tickFormatter={formatCurrency}
              />
              <YAxis
                type="category"
                dataKey="name"
                tick={{ fontSize: 11, fill: "#a09080" }}
                tickLine={false}
                axisLine={false}
                width={90}
              />
              <Tooltip content={<CustomTooltip />} />
              <Bar dataKey="earnings" radius={[0, 4, 4, 0]} maxBarSize={28}>
                {chartData.map((entry, index) => (
                  <Cell
                    key={`cell-${index}`}
                    fill={GENDER_COLORS[entry.gender || ""] || DEFAULT_COLOR}
                  />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        )}
      </div>

      {/* Gender legend */}
      <div className="mt-2 flex items-center gap-4 border-t border-beige-100 pt-3">
        <span className="text-[10px] text-beige-400">Gender:</span>
        {Object.entries(GENDER_COLORS).map(([gender, color]) => (
          <div key={gender} className="flex items-center gap-1.5">
            <span
              className="h-2 w-2 rounded-full"
              style={{ backgroundColor: color }}
            />
            <span className="text-[10px] capitalize text-beige-400">
              {gender}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}
