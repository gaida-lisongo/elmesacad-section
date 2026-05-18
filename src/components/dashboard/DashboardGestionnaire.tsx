'use client';

import DashboardPage from "./Dashboard";

interface DashboardGestionnaireProps {
  // Vous pouvez ajouter des props spécifiques au gestionnaire ici si nécessaire
  userName?: string;
  ui?: any; // Remplacez 'any' par le type approprié pour votre UI
  data: any; // Remplacez 'any' par le type approprié pour vos données
}

export default function DashboardGestionnaire({ userName, ui, data }: DashboardGestionnaireProps) {
    console.log("DashboardGestionnaire Props:", { userName, ui, data });
    return <DashboardPage />;
}
