// src/components/dashboard/Dashboard.tsx (ou votre chemin d'import actuel)
'use client';

import React, { ReactNode } from 'react';
import { Icon } from '@iconify/react';
import { Metric, ChartSerie } from "@/lib/services/loadDashboardDataByRole";
import type { WhiteListItem } from "@/components/secure/PageDashboard";
import { MetricItem } from './_components/MetricItem';
import { ChartCard } from './_components/ChartCard';
import { ListData } from './_components/ListData';

// Définition stricte des données attendues par le Dashboard de l'application
interface DashboardPageProps {
  initialData: {
    metrics: Metric[];
    chartData: ChartSerie[];
    whiteList: {categorie: string, list: WhiteListItem[]}[];
    categories: string[]; // Nouvelles catégories pour filtrer les données de la whitelist ou des graphiques
  };
  children?: ReactNode; // Permet d'injecter dynamiquement la table (TableData) configurée par le rôle parent
}

export default function DashboardPage({ initialData, children }: DashboardPageProps) {
  const { metrics = [], chartData = [], whiteList = [] } = initialData;

  // Extraction de la première série de graphiques transmise si elle existe
  const mainChart = chartData[0];

  // Calcul dynamique des indicateurs financiers additionnels du graphique à partir de la série d'activité
  const totalY1 = mainChart?.y ? mainChart.y.reduce((acc, curr) => acc + curr, 0) : 0;
  const totalY2 = mainChart?.y2 ? mainChart.y2.reduce((acc, curr) => acc + curr, 0) : 0;

  return (
    <div className="space-y-6 w-full">
      
      {/* 1. Zone Haute : Liste des Métriques Dynamiques */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
        {metrics.map((metric, idx) => {
          // Gestion sécurisée de l'icône : chaîne de caractères simple (Iconify) ou composant
          const iconContent = typeof metric.iconName === 'string' ? (
            <div className={`p-2 rounded-xl bg-${metric.iconColor || 'indigo'}-50 text-${metric.iconColor || 'indigo'}-600`}>
              <Icon icon={metric.iconName} className="w-6 h-6" />
            </div>
          ) : (
            metric.iconName
          );

          return (
            <MetricItem
              key={idx}
              title={metric.title}
              value={metric.value}
              proportion={metric.proportion}
              icone={iconContent}
            />
          );
        })}
      </div>

      {/* 2. Zone Intermédiaire : Graphiques et Whitelists Réelles */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 items-start">
        {/* Volet Gauche : Graphiques de répartition d'activité */}
        <div className="lg:col-span-2 space-y-6">
          {mainChart ? (
            <ChartCard
              data={mainChart}
              subtitle={mainChart.z?.title || "Aperçu général des activités"}
              extraInfo={
                <div className="flex gap-12 text-xs font-semibold text-slate-500">
                  <div>
                    Cumul Ressources : 
                    <span className="block text-lg font-bold text-indigo-600">
                      {totalY1} unités
                    </span>
                  </div>
                  <div>
                    Volume Financier : 
                    <span className="block text-lg font-bold text-emerald-600">
                      {totalY2.toLocaleString()} $ / CDF
                    </span>
                  </div>
                </div>
              }
            />
          ) : (
            <div className="bg-white rounded-2xl p-6 border border-slate-100 shadow-sm text-center text-slate-400 italic text-sm">
              Aucune donnée graphique disponible pour cette période.
            </div>
          )}
        </div>

        {/* Volet Droite : Whitelist ou stocks de ressources sous forme de liste */}
        <div className="lg:col-span-1">
          <ListData
            items={whiteList}
          />
        </div>
      </div>

      {/* 3. Zone Basse : Injection Contextuelle de la Table (Rôles Spécifiques) */}
      {children && (
        <div className="w-full pt-2">
          {children}
        </div>
      )}

    </div>
  );
}