import { agentHasAuthorizationCode } from "@/lib/dashboard/resolveDashboardUi";
import { loadOrganisateurCeChargesHoraires } from "@/lib/dashboard/loadOrganisateurCeChargesHoraires";
import type { DashboardAgentAuthorization, DashboardTableData } from "@/lib/dashboard/types";
import { loadDashboardUsersSampleTable } from "@/lib/services/dashboardUsersSampleTable";

const SAMPLE_LIMIT = 10;

/**
 * Tableau de bord organisateur : `tableData` selon l’habilitation.
 * - **CE** : charges horaires (programmes / UE de la section d’attache) via `chargesHoraires`.
 * - **Autres** (CS, CR, etc.) : même type d’aperçu utilisateurs qu’en admin, en lecture seule côté vue.
 */
export async function buildOrganisateurTableData(
  agentSub: string,
  authorizations: DashboardAgentAuthorization[]
): Promise<DashboardTableData> {
  if (agentHasAuthorizationCode(authorizations, "CE")) {
    const chargesHoraires = await loadOrganisateurCeChargesHoraires(agentSub);
    return {
      headers: ["Semestre", "Unité", "Code UE", "Charges"],
      listes: [],
      filters: [],
      rows: [],
      chargesHoraires,
    };
  }

  return loadDashboardUsersSampleTable(SAMPLE_LIMIT);
}
