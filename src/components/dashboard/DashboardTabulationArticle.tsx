"use client";

import type { DashboardAdminCapabilities, DashboardTableData } from "@/lib/dashboard/types";
import type { DashboardTabulationCapabilities } from "@/lib/dashboard/resolveDashboardTabulation";
import { renderTabulation } from "@/components/dashboard/renderDashboardTabulation";

export function DashboardTabulationArticle({
  tabulationTitle,
  tableData,
  tabulation,
  adminCapabilities,
}: {
  tabulationTitle: string;
  tableData: DashboardTableData;
  tabulation: DashboardTabulationCapabilities;
  adminCapabilities: DashboardAdminCapabilities;
}) {
  if (!tabulation.canShowTabulationArticle) return null;

  return (
    <article
      className="animate-dashboard-in rounded-xl border border-gray-200/80 bg-gradient-to-b from-white to-gray-50/30 p-4 shadow-sm transition duration-500 hover:shadow-md dark:border-gray-800 dark:from-gray-900 dark:to-gray-950/50 dark:hover:shadow-gray-900/30"
      style={{ animationDelay: "320ms" }}
    >
      <h2 className="mb-2 text-sm font-semibold text-midnight_text dark:text-white">{tabulationTitle}</h2>
      {renderTabulation({
        tableData,
        tabulation,
        adminCapabilities,
      })}
    </article>
  );
}
