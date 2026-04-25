import type {
  DashboardChartSeries,
  DashboardMetric,
  DashboardTableData,
  DashboardWhiteListItem,
} from "@/lib/dashboard/types";

const MONTHS_PLACEHOLDER = [
  "janv.",
  "févr.",
  "mars",
  "avr.",
  "mai",
  "juin",
  "juil.",
  "août",
  "sept.",
  "oct.",
  "nov.",
  "déc.",
];

const emptyRechargeByStatus: DashboardChartSeries[] = [
  { variable: "En attente", data: MONTHS_PLACEHOLDER.map((month) => ({ month, value: 0 })) },
  { variable: "Payé", data: MONTHS_PLACEHOLDER.map((month) => ({ month, value: 0 })) },
  { variable: "Échoué", data: MONTHS_PLACEHOLDER.map((month) => ({ month, value: 0 })) },
];

export function loadPlaceholderDashboardData(): {
  metrics: DashboardMetric[];
  whiteList: DashboardWhiteListItem[];
  chartData: DashboardChartSeries[];
  tableData: DashboardTableData;
  chartYear: number;
} {
  const y = new Date().getFullYear();
  return {
    metrics: [
      { title: "—", value: "—", progress: 0 },
      { title: "—", value: "—", progress: 0 },
      { title: "—", value: "—", progress: 0 },
    ],
    whiteList: [],
    chartData: emptyRechargeByStatus,
    tableData: {
      headers: ["Nom", "E-mail", "Matricule", "Statut", "Type"],
      listes: ["Étudiants", "Agents"],
      filters: ["Tous", "Actifs", "Inactifs"],
      rows: [],
    },
    chartYear: y,
  };
}
