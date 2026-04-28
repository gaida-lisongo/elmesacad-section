"use client";

import { useMemo } from "react";
import type { DashboardChartSeries } from "@/lib/dashboard/types";

const SERIES_STACK_COLORS = [
  "bg-gradient-to-t from-amber-600 to-amber-400 dark:from-amber-500 dark:to-amber-300",
  "bg-gradient-to-t from-emerald-600 to-emerald-400 dark:from-emerald-500 dark:to-emerald-300",
  "bg-gradient-to-t from-red-600 to-red-400 dark:from-red-500 dark:to-red-300",
];

export function RechargeStatusStackedChart({
  year,
  seriesList,
}: {
  year: number;
  seriesList: DashboardChartSeries[];
}) {
  const monthCount = seriesList[0]?.data.length ?? 12;
  const sums = useMemo(() => {
    const out: number[] = [];
    for (let i = 0; i < monthCount; i++) {
      let s = 0;
      for (const se of seriesList) {
        s += se.data[i]?.value ?? 0;
      }
      out.push(s);
    }
    return out;
  }, [seriesList, monthCount]);

  const max = useMemo(() => Math.max(1, ...sums), [sums]);

  return (
    <div>
      <p className="text-xs text-gray-500 transition-colors dark:text-gray-400">
        Recharges par statut — année {year} (calendrier)
      </p>
      <div className="mt-2 flex flex-wrap gap-3 text-[10px] text-gray-600 dark:text-gray-400">
        {seriesList.map((s, si) => (
          <span key={s.variable} className="inline-flex items-center gap-1.5">
            <span
              className={`inline-block size-2.5 rounded-sm ${SERIES_STACK_COLORS[si] ?? "bg-gray-400"}`}
              aria-hidden
            />
            {s.variable}
          </span>
        ))}
      </div>
      <div className="mt-3 flex h-48 gap-0.5 sm:gap-1">
        {Array.from({ length: monthCount }, (_, i) => {
          const sum = sums[i] ?? 0;
          const colFrac = sum / max;
          return (
            <div
              key={seriesList[0]?.data[i]?.month ?? i}
              className="group/col flex min-h-0 min-w-0 flex-1 flex-col items-stretch justify-end"
              title={`Total ${sum} — ${seriesList[0]?.data[i]?.month ?? ""} ${year}`}
            >
              <div className="flex min-h-0 w-full flex-1 flex-col justify-end">
                <div
                  className="flex w-full flex-col justify-end overflow-hidden rounded-t transition-all"
                  style={{
                    height: `${colFrac * 100}%`,
                    minHeight: sum > 0 ? 4 : 0,
                  }}
                >
                  {sum > 0 &&
                    seriesList.map((se, j) => {
                      const v = se.data[i]?.value ?? 0;
                      if (v <= 0) return null;
                      const h = (v / sum) * 100;
                      return (
                        <div
                          key={se.variable}
                          className={`w-full ${SERIES_STACK_COLORS[j] ?? "bg-gray-500"} shadow-sm transition hover:brightness-110`}
                          style={{
                            height: `${h}%`,
                            minHeight: 3,
                          }}
                          title={`${se.variable}: ${v}`}
                        />
                      );
                    })}
                </div>
              </div>
              <span className="max-w-full truncate pt-1 text-center text-[10px] text-gray-500 transition-colors group-hover/col:text-sky-600 dark:text-gray-400 dark:group-hover/col:text-sky-300">
                {seriesList[0]?.data[i]?.month}
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
}
