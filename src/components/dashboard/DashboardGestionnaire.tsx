// src/components/dashboard/DashboardGestionnaire.tsx
'use client';

import React from 'react';
import Link from 'next/link';
import { ChartSerie, Metric, WhiteListItem } from "@/lib/services/loadDashboardDataByRole";
import DashboardPage from "./Dashboard";
import { TableData } from './_components/TableData';

interface DashboardGestionnaireProps {
  metrics: Metric[]; 
  categories: string[];
  chartData: ChartSerie;
  whiteList: { categorie: string; list: WhiteListItem[] }[];
  tableData: {
    categories: { slug: string; designation: string; }[];
    rows: any[];
  };
}

export default function DashboardGestionnaire({ metrics, categories, chartData,  whiteList, tableData }: DashboardGestionnaireProps) {
  const tableHeaders = ["Désignation", "Code / Slug", "Volume Horaire / Crédits", "Semestres", "Actions"];

  // Callback de construction de carte ligne par ligne
  const renderProgrammeRow = (programme: any, index: number, selectedCategorySlug: string) => {
    const targetUrl = `/section/p/${selectedCategorySlug}/${programme.slug}`;

    return (
      <tr key={programme._id || index} className="hover:bg-slate-50/80 transition-colors group">
        <td className="px-6 py-4 font-semibold text-slate-800">
          <div className="flex flex-col">
            <span>{programme.designation}</span>
            <span className="text-xs text-slate-400 font-normal mt-0.5">
              Cycle: {programme.section?.cycle || 'Licence'}
            </span>
          </div>
        </td>
        <td className="px-6 py-4">
          <span className="bg-slate-100 text-slate-600 text-xs font-mono px-2 py-1 rounded-md">{programme.slug}</span>
        </td>
        <td className="px-6 py-4 text-slate-600 font-medium">
          <span className="text-indigo-600">{programme.credits || 0}</span> H / Crd
        </td>
        <td className="px-6 py-4">
          <span className="bg-indigo-50 text-indigo-700 text-xs px-2.5 py-1 rounded-full font-semibold">
            {programme.semestres?.length || 0} Semestre(s)
          </span>
        </td>
        <td className="px-6 py-4 text-right">
          <Link
            href={targetUrl}
            className="inline-flex items-center gap-1 bg-indigo-50 text-indigo-600 text-xs font-bold px-3 py-1.5 rounded-xl hover:bg-indigo-600 hover:text-white transition-all group-hover:translate-x-0.5"
          >
            <span>Voir le parcours</span>
            <span className="text-[10px]">➔</span>
          </Link>
        </td>
      </tr>
    );
  };

  return (
    <DashboardPage 
      initialData={{
        metrics: metrics,
        categories: categories,
        chartData: [chartData],
        whiteList: whiteList // Aplatit le tableau imbriqué du serveur pour ListData
      }}
    >
      {/* Tout ce qui est placé ici sera automatiquement injecté à l'emplacement du {children} dans DashboardPage */}
      <div className="space-y-4">
        <div>
          <h2 className="text-lg font-bold text-slate-800">Programmes d'Études Répertoriés</h2>
          <p className="text-xs text-slate-400">Sélectionnez l'année universitaire pour générer l'accès aux parcours d'affectation.</p>
        </div>

        <TableData
          headers={tableHeaders}
          items={tableData.rows}
          categories={tableData.categories}
          searchPlaceholder="Rechercher un programme (ex: L1 CIB)..."
          searchKey="designation"
          renderRow={renderProgrammeRow}
        />
      </div>
    </DashboardPage>
  );
}