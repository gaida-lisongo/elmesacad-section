import type { DashboardTableData, DashboardTableRow } from "@/lib/dashboard/types";
import { connectDB } from "@/lib/services/connectedDB";
import userManager from "@/lib/services/UserManager";

/**
 * Échantillon étudiants + agents (même logique que l’aperçu admin) pour tableaux en lecture seule.
 */
export async function loadDashboardUsersSampleTable(limit: number): Promise<DashboardTableData> {
  await connectDB();
  const search = "";
  const stuRows = await userManager.getStudentsList({ search, offset: 0, limit, status: "inactive" });
  const rows: DashboardTableRow[] = stuRows.map((u) => ({
    id: u.id,
    columns: [u.name, u.email, u.matricule, u.status, "Étudiant"],
  }));
  if (rows.length < limit) {
    const need = limit - rows.length;
    const ag = await userManager.getAgentsPaginated({ search, offset: 0, limit: need, status: "inactive" });
    for (const u of ag) {
      rows.push({
        id: u.id,
        columns: [u.name, u.email, u.matricule, u.status, `Agent (${u.role})`],
      });
    }
  }
  return {
    headers: ["Nom", "E-mail", "Matricule", "Statut", "Type"],
    listes: ["Étudiants", "Agents"],
    filters: ["Tous", "Actifs", "Inactifs"],
    rows,
  };
}
