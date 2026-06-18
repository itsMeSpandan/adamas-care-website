"use client";

import { useState, useRef, useEffect } from "react";
import { motion } from "framer-motion";

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

export default function RevenueChart({ data, totalRevenue }: RevenueChartProps) {
  const [hoveredIndex, setHoveredIndex] = useState<number | null>(null);
  const chartRef = useRef<HTMLDivElement>(null);
  const [chartHeight, setChartHeight] = useState(0);

  const maxRevenue = Math.max(...data.map((d) => d.revenue), 1);
  const hasData = data.some((d) => d.revenue > 0);

  useEffect(() => {
    if (!chartRef.current) return;
    const obs = new ResizeObserver((entries) => {
      for (const entry of entries) {
        setChartHeight(entry.contentRect.height);
      }
    });
    obs.observe(chartRef.current);
    return () => obs.disconnect();
  }, []);

  // Y-axis ticks (4 evenly spaced)
  const yTicks = [1, 0.75, 0.5, 0.25, 0].map((pct) => ({
    value: Math.round(maxRevenue * pct),
    label: `₹${Math.round(maxRevenue * pct).toLocaleString()}`,
  }));

  const formatCurrency = (value: number) => `₹${value.toLocaleString()}`;

  const barAreaHeight = Math.max(chartHeight - 20, 0); // reserve space for month labels

  return (
    <div className="flex h-full flex-col">
      {/* Chart area */}
      <div className="flex flex-1 gap-3 min-h-0">
        {/* Y-axis labels */}
        <div className="flex w-16 flex-col justify-between text-right" style={{ height: barAreaHeight }}>
          {yTicks.map((tick, i) => (
            <span key={i} className="text-[10px] text-beige-400 leading-none">
              {tick.label}
            </span>
          ))}
        </div>

        {/* Grid lines + bars */}
        <div ref={chartRef} className="relative flex-1 min-w-0">
          {/* Horizontal grid lines */}
          <div className="absolute inset-x-0 top-0 flex flex-col justify-between" style={{ height: barAreaHeight }}>
            {[0, 1, 2, 3, 4].map((i) => (
              <div key={i} className="border-t border-beige-100 w-full" />
            ))}
          </div>

          {!hasData && chartHeight > 0 && (
            <div className="absolute inset-0 flex items-center justify-center">
              <p className="text-sm text-beige-400">No revenue data yet</p>
            </div>
          )}

          {/* Bars */}
          <div className="absolute inset-x-0 bottom-5 top-0 flex items-end gap-1 sm:gap-2">
            {data.map((month, i) => {
              const barHeight = barAreaHeight > 0 ? (month.revenue / maxRevenue) * barAreaHeight : 0;
              const isHovered = hoveredIndex === i;

              return (
                <div
                  key={i}
                  className="group relative flex flex-1 items-end h-full"
                  onMouseEnter={() => setHoveredIndex(i)}
                  onMouseLeave={() => setHoveredIndex(null)}
                >
                  {/* Tooltip */}
                  {isHovered && (
                    <div className="absolute -top-16 left-1/2 z-10 -translate-x-1/2 whitespace-nowrap rounded-lg bg-beige-700 px-3 py-1.5 text-xs font-medium text-white shadow-lg">
                      {month.label}
                      <br />
                      <span className="text-beige-200">{formatCurrency(month.revenue)}</span>
                      {month.prevRevenue > 0 && (
                        <>
                          <br />
                          <span className={`text-[10px] ${month.revenue >= month.prevRevenue ? "text-emerald-300" : "text-red-300"}`}>
                            {month.revenue >= month.prevRevenue ? "↑" : "↓"} {formatCurrency(Math.abs(month.revenue - month.prevRevenue))} vs prev month
                          </span>
                        </>
                      )}
                      <div className="absolute -bottom-1 left-1/2 h-2 w-2 -translate-x-1/2 rotate-45 bg-beige-700" />
                    </div>
                  )}

                  {/* Previous month indicator line */}
                  {month.prevRevenue > 0 && barAreaHeight > 0 && (
                    <div
                      className="absolute left-0 right-0 border-t border-dashed border-beige-300 z-[1]"
                      style={{ bottom: (month.prevRevenue / maxRevenue) * barAreaHeight }}
                    />
                  )}

                  {/* Bar */}
                  <motion.div
                    className={`w-full rounded-t-md transition-colors relative z-[2] ${
                      isHovered
                        ? "bg-amber-500"
                        : month.revenue > 0
                          ? "bg-amber-400"
                          : "bg-beige-100"
                    }`}
                    initial={{ height: 0 }}
                    animate={{ height: Math.max(barHeight, month.revenue > 0 ? 2 : 0) }}
                    transition={{
                      duration: 0.6,
                      delay: i * 0.05,
                      ease: "easeOut",
                    }}
                  />

                  {/* Month label */}
                  <span className="absolute -bottom-4 left-1/2 -translate-x-1/2 text-[10px] text-beige-400 whitespace-nowrap">
                    {month.shortLabel}
                  </span>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* Summary line */}
      <div className="mt-4 flex items-center justify-between border-t border-beige-100 pt-3">
        <span className="text-sm text-beige-500">Total Revenue</span>
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-1.5">
            <span className="h-0.5 w-4 rounded bg-amber-400" />
            <span className="text-[10px] text-beige-400">This month</span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="h-0.5 w-4 rounded border-t border-dashed border-beige-300" />
            <span className="text-[10px] text-beige-400">Prev month</span>
          </div>
          <span className="text-lg font-bold text-beige-700">
            {formatCurrency(totalRevenue)}
          </span>
        </div>
      </div>
    </div>
  );
}
