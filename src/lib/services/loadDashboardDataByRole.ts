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
export interface Metric {
  title: string;
  value: string | number;
  unit?: string;
  proportion: number;
  iconName: string;   // Le slug de l'icône (ex: "ion:eye-outline")
  iconColor: string;  // Le nom de la couleur (ex: "emerald")
}

export interface ChartSerie {
  x: string[];
  y: number[];
  y2?: number[]; // Optionnel, pour les graphiques combinés
  z: { slug: string; title: string };
}

export type WhiteListItem = {
  title: string;
  description: string;
  value: string;
  proportion: number;
  icon: any;
  url?: string;
}

type Bundle = {
  metrics: DashboardMetric[];
  whiteList: DashboardWhiteListItem[];
  chartData: DashboardChartSeries[];
  tableData: DashboardTableData;
  chartYear: number;
};

function resolveCurrentAnnee(whiteList: DashboardWhiteListItem[]): { id: string; label: string } | null {
  if (whiteList.length === 0) return null;
  // Contexte section: on prend la plus récente (triée par début décroissant),
  // sans dépendre du flag global `status`.
  const firstWithId = whiteList.find((x) => x.id);
  if (!firstWithId?.id) return null;
  return {
    id: firstWithId.id,
    label: firstWithId.designation || `${firstWithId.debut}-${firstWithId.fin}`,
  };
}

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
      id: String(d._id),
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

async function generateSectionMetrics(role: Exclude<DashboardRole, "admin" | "student">, section: string): Promise<Metric[]> {
  try {

    await connectDB();

    switch (role) {
      case "titulaire":
        return [
          { title: "TP & activités", value: "—", proportion: 0, iconName: "ion:document-text-outline", iconColor: "blue" },
          { title: "QCM", value: "—", proportion: 0, iconName: "ion:checkbox-outline", iconColor: "violet" },
          { title: "Notes", value: "—", proportion: 0, iconName: "ion:star-outline", iconColor: "amber" },
        ];
      case "organisateur":
        return [
          { title: "Programmes", value: "—", proportion: 0, iconName: "ion:calendar-outline", iconColor: "indigo" },
          { title: "Sessions jury", value: "—", proportion: 0, iconName: "ion:ribbon-outline", iconColor: "rose" },
          { title: "Archives", value: "—", proportion: 0, iconName: "ion:archive-outline", iconColor: "slate" },
        ];
      case "gestionnaire":
        //Fetch all enrollements
        //Fetch all validation fiches
        //Fetch all relevés
        //Fetch all laboratory


        return [
          { title: "Enrollements", value: "—", proportion: 0, iconName: "ion:person-add-outline", iconColor: "emerald" },
          { title: "Fiches de validation", value: "—", proportion: 0, iconName: "ion:id-card-outline", iconColor: "sky" },
          { title: "Relevés", value: "—", proportion: 0, iconName: "ion:receipt-outline", iconColor: "orange" },
        ];
      default:
        return [];
    }
    
  } catch (error) {
    console.error("Error generating metrics:", error);
    return [];
  }
}

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
    const currentAnnee = resolveCurrentAnnee(whiteList);
    return {
      ...base,
      metrics: staffMetrics(role),
      whiteList,
      tableData: {
        ...emptyTable,
        rows: [],
        ...(role === "gestionnaire" && currentAnnee
          ? {
              gestionnaireParcours: {
                currentAnneeId: currentAnnee.id,
                currentAnneeLabel: currentAnnee.label,
              },
            }
          : {}),
      },
    };
  }

  return base;
}
