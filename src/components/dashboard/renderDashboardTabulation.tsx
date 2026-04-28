import type { ReactNode } from "react";
import type { DashboardAdminCapabilities, DashboardTableData } from "@/lib/dashboard/types";
import type { DashboardTabulationCapabilities } from "@/lib/dashboard/resolveDashboardTabulation";
import { AdminUserTableBlock } from "@/components/dashboard/tables/AdminUsersTable";
import { GestionnaireParcoursTable } from "@/components/dashboard/tables/GestionnaireParcoursTable";
import { ReadonlyUserTable } from "@/components/dashboard/tables/ReadonlyUserTable";
import { TableChargeHoraire } from "@/components/dashboard/tables/TableChargeHoraire";

export type RenderDashboardTabulationArgs = {
  tableData: DashboardTableData;
  tabulation: DashboardTabulationCapabilities;
  adminCapabilities: DashboardAdminCapabilities;
  currentAnneeId?: string;
  currentAnneeLabel?: string;
};

/**
 * Route le bon composant de tabulation selon les flags `canRenderTabulation*`.
 */
export function renderDashboardTabulation({
  tableData,
  tabulation,
  adminCapabilities,
  currentAnneeId,
  currentAnneeLabel,
}: RenderDashboardTabulationArgs): ReactNode {
  const chargesPayload = tableData.chargesHoraires;

  if (tabulation.canRenderTabulationChargesHoraires && chargesPayload) {
    return (
      <>
        <p className="mb-3 text-xs text-gray-500 dark:text-gray-400">
          Réservé à l’habilitation <strong>CE</strong> (chargé de l’enseignement) : programmes et unités de votre section,
          service titulaire via actions serveur.
        </p>
        <TableChargeHoraire payload={chargesPayload} />
      </>
    );
  }

  if (tabulation.canRenderTabulationAdminUsers) {
    return (
      <AdminUserTableBlock
        listes={tableData.listes}
        filters={tableData.filters}
        canManageAccounts={adminCapabilities.canManageUserAccounts}
      />
    );
  }

  if (tabulation.canGestionnaireRenderReadonlyTabulation && tableData.gestionnaireParcours) {
    const effectiveAnneeId = currentAnneeId || tableData.gestionnaireParcours.currentAnneeId;
    const effectiveAnneeLabel = currentAnneeLabel || tableData.gestionnaireParcours.currentAnneeLabel;
    return (
      <GestionnaireParcoursTable
        currentAnneeId={effectiveAnneeId}
        currentAnneeLabel={effectiveAnneeLabel}
      />
    );
  }

  if (tabulation.canRenderTabulationReadonlyUsers) {
    return <ReadonlyUserTable rows={tableData.rows} headers={tableData.headers} />;
  }

  return null;
}

/** Alias demandé pour le routage de tabulation dans le dashboard. */
export const renderTabulation = renderDashboardTabulation;
