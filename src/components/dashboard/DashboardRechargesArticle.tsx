"use client";

import type { DashboardChartSeries, DashboardRole } from "@/lib/dashboard/types";
import { RechargeStatusStackedChart } from "@/components/dashboard/RechargeStatusStackedChart";

export function DashboardRechargesArticle({
  role,
  showRechargesChart,
  chartData,
  chartYear,
}: {
  role: DashboardRole;
  showRechargesChart: boolean;
  chartData: DashboardChartSeries[];
  chartYear: number;
}) {
  return (
    <article
      className="animate-dashboard-in rounded-xl border border-gray-200/80 bg-gradient-to-b from-white to-sky-50/20 p-4 shadow-sm transition duration-500 hover:shadow-md dark:border-gray-800 dark:from-gray-900 dark:to-sky-950/10 dark:hover:shadow-sky-950/20 lg:col-span-3"
      style={{ animationDelay: "200ms" }}
    >
      <h2 className="text-sm font-semibold text-midnight_text dark:text-white">Recharges</h2>
      {showRechargesChart && chartData.length > 0 ? (
        <div className="mt-2">
          <RechargeStatusStackedChart year={chartYear} seriesList={chartData} />
        </div>
      ) : (
        <div className="mt-6 flex h-48 items-center justify-center rounded-lg border border-dashed border-gray-300 text-sm text-gray-500 transition dark:border-gray-700">
          {role === "admin"
            ? "Aucune donnée de recharge sur la période."
            : "Graphique réservé à l’administration."}
        </div>
      )}
    </article>
  );
}
