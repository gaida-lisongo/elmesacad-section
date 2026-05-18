'use client';

import { ChartSerie, Metric, WhiteListItem } from "@/lib/services/loadDashboardDataByRole";
import DashboardPage from "./Dashboard";

interface DashboardGestionnaireProps {
  // Vous pouvez ajouter des props spécifiques au gestionnaire ici si nécessaire
  metrics: Metric[]; 
  chartData: ChartSerie;
  whiteList: {categorie: string; list: WhiteListItem[]}[];
  tableData: {
    categories: {
        slug: string;
        designation: string;
    }[];
    rows: any[]; // Adaptez le type selon la structure de vos données
  }
}

export default function DashboardGestionnaire({ metrics, chartData, whiteList, tableData }: DashboardGestionnaireProps) {
    console.log("DashboardGestionnaire Props:", { metrics, chartData, whiteList, tableData });
    return <DashboardPage />;
}
