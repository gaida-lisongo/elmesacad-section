import { getSessionPayload } from "@/lib/auth/sessionServer";
import type { DashboardRole } from "@/lib/dashboard/types";
import { loadAdminDashboardData } from "@/lib/services/dashboardAdminData";
import { loadPlaceholderDashboardData } from "@/lib/services/placeholderDashboardData";
import DashboardView from "./DashboardView";

function mapSessionToDashboardRole(
  s: Awaited<ReturnType<typeof getSessionPayload>>
): DashboardRole {
  if (!s) return "organisateur";
  if (s.type === "Student") return "student";
  const r = s.role;
  if (r === "admin" || r === "titulaire" || r === "organisateur" || r === "gestionnaire") {
    return r;
  }
  return "organisateur";
}

function roleInfoMessage(role: DashboardRole): string | undefined {
  if (role === "admin") return undefined;
  if (role === "student") {
    return "Espace étudiant : les indicateurs détaillés arriveront ici prochainement.";
  }
  if (role === "titulaire") {
    return "Espace titulaire : le tableau de bord métier sera complété ultérieurement.";
  }
  return "Les statistiques avancées pour votre rôle seront affichées ici bientôt.";
}

export default async function DashboardPage() {
  const session = await getSessionPayload();
  const role = mapSessionToDashboardRole(session);
  const isAdmin = role === "admin";
  const data = isAdmin
    ? await loadAdminDashboardData()
    : loadPlaceholderDashboardData();
  const userName = session?.name || session?.email;

  return (
    <DashboardView
      title="Tableau de bord"
      role={role}
      userName={userName}
      infoMessage={roleInfoMessage(role)}
      chartYear={data.chartYear}
      metrics={data.metrics}
      whiteList={data.whiteList}
      chartData={data.chartData}
      tableData={data.tableData}
    />
  );
}
