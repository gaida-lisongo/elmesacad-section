"use client";

import type { DashboardMetric } from "@/lib/dashboard/types";

export function DashboardMetricsGrid({ metrics }: { metrics: DashboardMetric[] }) {
  if (metrics.length === 0) return null;

  return (
    <div className="grid gap-4 md:grid-cols-3">
      {metrics.slice(0, 3).map((metric, mi) => (
        <article
          key={`${metric.title}-${mi}`}
          className="animate-dashboard-in group rounded-xl border border-gray-200/80 bg-gradient-to-b from-white to-gray-50/50 p-4 shadow-sm transition duration-500 ease-out hover:-translate-y-1 hover:shadow-md dark:border-gray-800 dark:from-gray-900 dark:to-gray-900/50 dark:shadow-gray-950/30 dark:hover:shadow-lg"
          style={{ animationDelay: `${80 + mi * 70}ms` }}
        >
          <p className="text-xs font-medium uppercase tracking-wider text-gray-500 dark:text-gray-400">
            {metric.title}
          </p>
          <p className="mt-2 text-2xl font-bold tabular-nums text-midnight_text transition group-hover:text-sky-700 dark:text-white dark:group-hover:text-sky-300">
            {metric.value}
          </p>
          <div className="mt-3 h-2 w-full overflow-hidden rounded-full bg-gray-100/80 dark:bg-gray-800">
            <div
              className="h-full rounded-full bg-gradient-to-r from-sky-500 to-sky-400 transition-all duration-700 ease-out dark:from-sky-400 dark:to-secondary"
              style={{ width: `${Math.min(100, Math.max(0, metric.progress))}%` }}
            />
          </div>
          <p className="mt-1.5 text-xs text-gray-500 tabular-nums dark:text-gray-400">{metric.progress}%</p>
        </article>
      ))}
    </div>
  );
}
