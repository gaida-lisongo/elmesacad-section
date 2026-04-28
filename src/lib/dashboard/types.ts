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

/** Ligne UE pour le tableau charges (dashboard CE), rattachée à un programme. */
export type OrganisateurCeChargeRow = {
  key: string;
  programmeId: string;
  sectionId: string;
  sectionDesignation: string;
  programmeDesignation: string;
  semestreDesignation: string;
  uniteDesignation: string;
  uniteCode: string;
  uniteId: string;
};

/** Données SSR : une section d’attache, liste des programmes (filtre), toutes les lignes UE. */
export type OrganisateurCeChargesHorairesPayload = {
  sectionId: string;
  sectionDesignation: string;
  programmes: { _id: string; designation: string; slug: string }[];
  rows: OrganisateurCeChargeRow[];
};

/**
 * - listes: valeurs des filtres (ex. type de liste, étudiants / agents)
 * - filters: ex. actif / inactif
 * - chargesHoraires: réservé à l’organisateur **CE** — si présent, la vue affiche le tableau charges à la place du listing utilisateurs.
 */
export type DashboardTableData = {
  headers: string[];
  listes: string[];
  filters: string[];
  rows: DashboardTableRow[];
  chargesHoraires?: OrganisateurCeChargesHorairesPayload;
};

export type DashboardRole =
  | "admin"
  | "titulaire"
  | "organisateur"
  | "gestionnaire"
  | "student";

/** Autorisations agent (chargées en amont côté serveur + `/api/auth/me`). */
export type DashboardAgentAuthorization = {
  id: string;
  code: string;
  designation: string;
};

export type DashboardAnneesMode = "crud" | "readonly" | "hidden";
export type DashboardUsersTableMode = "admin" | "readonly" | "hidden";

export type DashboardUiConfig = {
  subtitle?: string;
  showMetricsRow: boolean;
  showRechargesChart: boolean;
  anneesMode: DashboardAnneesMode;
  usersTableMode: DashboardUsersTableMode;
};

/** Capacités dashboard admin dérivées des codes `Authorization.code`. */
export type DashboardAdminCapabilities = {
  /** SA — filières. */
  canManageFilieres: boolean;
  /** MD — comptes utilisateurs (créer / réinitialiser). */
  canManageUserAccounts: boolean;
  /** WM — recharges (détails). */
  canReadTransactions: boolean;
};

export type DashboardViewProps = {
  title: string;
  role: DashboardRole;
  userName?: string;
  /** Message si données non dispo pour ce rôle */
  infoMessage?: string;
  /** Présentation par type de compte (comme le menu flottant). */
  ui: DashboardUiConfig;
  /** Agents uniquement : habilitations Mongo, résolues au rendu SSR. */
  agentAuthorizations?: DashboardAgentAuthorization[];
  /** Permissions effectives calculées côté serveur. */
  adminCapabilities?: DashboardAdminCapabilities;
  metrics: DashboardMetric[];
  whiteList: DashboardWhiteListItem[];
  chartData: DashboardChartSeries[];
  tableData: DashboardTableData;
  /** Période affichage graphique recharges (année calendaire) */
  chartYear: number;
};
