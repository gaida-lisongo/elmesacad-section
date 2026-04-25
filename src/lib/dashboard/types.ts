/**
 * Données du dashboard (pilotées côté serveur pour le premier rendu, enrichies côté client).
 */
export type DashboardMetric = {
  title: string;
  value: string;
  /** 0–100, ratio (ex. actifs / total) */
  progress: number;
};

export type DashboardWhiteListItem = {
  /** Mongo id pour le CRUD (admin) */
  id?: string;
  debut: number;
  fin: number;
  /** Libellé libre optionnel (affiché en secondaire) */
  designation: string;
  slug: string;
  status: boolean;
};

export type DashboardChartPoint = { month: string; value: number };

export type DashboardChartSeries = {
  variable: string;
  data: DashboardChartPoint[];
};

export type DashboardTableRow = {
  id: string;
  /** Valeurs textuelles (une colonne peut contenir l’e-mail pour les actions) */
  columns: string[];
};

/**
 * - listes: valeurs des filtres (ex. type de liste, étudiants / agents)
 * - filters: ex. actif / inactif
 */
export type DashboardTableData = {
  headers: string[];
  listes: string[];
  filters: string[];
  rows: DashboardTableRow[];
};

export type DashboardRole =
  | "admin"
  | "titulaire"
  | "organisateur"
  | "gestionnaire"
  | "student";

export type DashboardViewProps = {
  title: string;
  role: DashboardRole;
  userName?: string;
  /** Message si données non dispo pour ce rôle */
  infoMessage?: string;
  metrics: DashboardMetric[];
  whiteList: DashboardWhiteListItem[];
  chartData: DashboardChartSeries[];
  tableData: DashboardTableData;
  /** Période affichage graphique recharges (année calendaire) */
  chartYear: number;
};
