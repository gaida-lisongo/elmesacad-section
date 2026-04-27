import type { DashboardRole } from "@/lib/dashboard/types";
import { loadAdminDashboardData } from "@/lib/services/dashboardAdminData";
import { loadPlaceholderDashboardData } from "@/lib/services/placeholderDashboardData";
import { connectDB } from "@/lib/services/connectedDB";
import { AnneeModel } from "@/lib/models/Annee";
import type {
  DashboardChartSeries,
  DashboardMetric,
  DashboardTableData,
  DashboardWhiteListItem,
} from "@/lib/dashboard/types";

type Bundle = {
  metrics: DashboardMetric[];
  whiteList: DashboardWhiteListItem[];
  chartData: DashboardChartSeries[];
  tableData: DashboardTableData;
  chartYear: number;
};

async function mapAnneesToWhiteList(): Promise<DashboardWhiteListItem[]> {
  const annees = await AnneeModel.find().sort({ debut: -1 }).limit(24).lean().exec();
  return annees.map((a) => {
    const d = a as {
      _id: unknown;
      designation?: string;
      slug: string;
      status: boolean;
      debut: number;
      fin: number;
    };
    const des =
      d.designation != null && String(d.designation).trim() !== ""
        ? String(d.designation).trim()
        : "";
    return {
      id: undefined,
      debut: d.debut,
      fin: d.fin,
      designation: des,
      slug: d.slug,
      status: Boolean(d.status),
    };
  });
}

function staffMetrics(role: Exclude<DashboardRole, "admin" | "student">): DashboardMetric[] {
  switch (role) {
    case "titulaire":
      return [
        { title: "TP & activités", value: "—", progress: 0 },
        { title: "QCM", value: "—", progress: 0 },
        { title: "Notes", value: "—", progress: 0 },
      ];
    case "organisateur":
      return [
        { title: "Programmes", value: "—", progress: 0 },
        { title: "Sessions jury", value: "—", progress: 0 },
        { title: "Archives", value: "—", progress: 0 },
      ];
    case "gestionnaire":
      return [
        { title: "Enrollements", value: "—", progress: 0 },
        { title: "Fiches de validation", value: "—", progress: 0 },
        { title: "Relevés", value: "—", progress: 0 },
      ];
    default:
      return [
        { title: "—", value: "—", progress: 0 },
        { title: "—", value: "—", progress: 0 },
        { title: "—", value: "—", progress: 0 },
      ];
  }
}

const emptyTable: DashboardTableData = {
  headers: ["Nom", "E-mail", "Matricule", "Statut", "Type"],
  listes: ["Étudiants", "Agents"],
  filters: ["Tous", "Actifs", "Inactifs"],
  rows: [],
};

/**
 * Données initiales du tableau de bord selon le rôle (SSR).
 * - `admin` : agrégations complètes.
 * - rôles agent « métier » : métriques placeholders + années en lecture seule.
 * - `student` : jeu minimal (écran à compléter plus tard).
 */
export async function loadDashboardDataByRole(role: DashboardRole): Promise<Bundle> {
  if (role === "admin") {
    return loadAdminDashboardData();
  }

  const base = loadPlaceholderDashboardData();

  if (role === "student") {
    return {
      ...base,
      metrics: [],
      chartData: [],
      tableData: { ...emptyTable, rows: [] },
      whiteList: [],
    };
  }

  if (role === "titulaire" || role === "organisateur" || role === "gestionnaire") {
    await connectDB();
    const whiteList = await mapAnneesToWhiteList();
    return {
      ...base,
      metrics: staffMetrics(role),
      whiteList,
      tableData: { ...emptyTable, rows: [] },
    };
  }

  return base;
}
