"use client";

import type { DashboardAdminCapabilities } from "@/lib/dashboard/types";
import FilieresDataTableSection from "@/components/filiere/FilieresDataTableSection";
import { TransactionsPanel } from "@/components/dashboard/tables/DashboardTransactionsTable";

export function DashboardAdminModulesGrid({
  adminCapabilities,
}: {
  adminCapabilities: DashboardAdminCapabilities;
}) {
  const { canManageFilieres, canReadTransactions } = adminCapabilities;
  if (!canManageFilieres && !canReadTransactions) return null;

  return (
    <div
      className={`grid w-full min-w-0 gap-4 ${
        canManageFilieres && canReadTransactions ? "lg:grid-cols-2" : "grid-cols-1"
      }`}
    >
      {canManageFilieres && (
        <div className="min-w-0">
          <FilieresDataTableSection />
        </div>
      )}
      {canReadTransactions && (
        <div className="min-w-0">
          <TransactionsPanel />
        </div>
      )}
    </div>
  );
}
