"use client";

import type { DashboardViewProps } from "@/lib/dashboard/types";
import { DEFAULT_ADMIN_CAPABILITIES } from "@/lib/dashboard/defaultDashboardCapabilities";
import {
  dashboardTabulationTitle,
  resolveDashboardTabulationCaps,
} from "@/lib/dashboard/resolveDashboardTabulation";
import { DashboardAdminModulesGrid } from "@/components/dashboard/DashboardAdminModulesGrid";
import { DashboardAnneesArticle } from "@/components/dashboard/DashboardAnneesArticle";
import { DashboardMetricsGrid } from "@/components/dashboard/DashboardMetricsGrid";
import { DashboardRechargesArticle } from "@/components/dashboard/DashboardRechargesArticle";
import { DashboardStudentPlaceholder } from "@/components/dashboard/DashboardStudentPlaceholder";
import { DashboardTabulationArticle } from "@/components/dashboard/DashboardTabulationArticle";
import { DashboardViewHeader } from "@/components/dashboard/DashboardViewHeader";

export default function DashboardView(props: DashboardViewProps) {
  const {
    title,
    role,
    userName,
    infoMessage,
    ui,
    agentAuthorizations = [],
    adminCapabilities = DEFAULT_ADMIN_CAPABILITIES,
    metrics,
    whiteList,
    chartData,
    tableData,
    chartYear,
  } = props;

  const isStudentMinimal =
    !ui.showMetricsRow && ui.anneesMode === "hidden" && ui.usersTableMode === "hidden";

  const tabulation = resolveDashboardTabulationCaps(
    role,
    ui,
    tableData,
    agentAuthorizations,
    adminCapabilities
  );
  const tabulationTitle = dashboardTabulationTitle(role, tabulation);

  return (
    <section className="w-full min-w-0 space-y-6">
      <DashboardViewHeader title={title} userName={userName} infoMessage={infoMessage} ui={ui} />

      {isStudentMinimal ? (
        <DashboardStudentPlaceholder />
      ) : (
        <>
          {ui.showMetricsRow && <DashboardMetricsGrid metrics={metrics} />}

          <div className="grid gap-4 lg:grid-cols-5">
            <DashboardRechargesArticle
              role={role}
              showRechargesChart={ui.showRechargesChart}
              chartData={chartData}
              chartYear={chartYear}
            />
            <DashboardAnneesArticle anneesMode={ui.anneesMode} whiteList={whiteList} />
          </div>

          <DashboardTabulationArticle
            tabulationTitle={tabulationTitle}
            tableData={tableData}
            tabulation={tabulation}
            adminCapabilities={adminCapabilities}
          />

          {role === "admin" && <DashboardAdminModulesGrid adminCapabilities={adminCapabilities} />}
        </>
      )}
    </section>
  );
}
