// src/app/dashboard/page.tsx
'use client';

import React from 'react';
import { Icon } from '@iconify/react';

// Importation de vos données mockées
import {
  mockMetrics,
  mockPaymentsChart,
  mockWeeklyProfitChart,
  mockStocks,
  mockTableUsers,
  UserRow,
} from '@/components/dashboard/mocks/mockDashboard';
import { MetricItem } from './_components/MetricItem';
import { ChartCard } from './_components/ChartCard';
import { ListData } from './_components/ListData';
import { TableData } from './_components/TableData';

export default function DashboardPage() {
  // Injection de la fonction de rendu d'icônes Iconify standard
  const renderIcon = (props: { icon: any; className?: string }) => (
    <Icon icon={props.icon} className={props.className} />
  );

  const metrics = mockMetrics(renderIcon);
  const stocks = mockStocks(renderIcon);

  return (
    <div className="">
      
      {/* 1. Zone Haute : Liste des Métriques (Capture d'écran 3) */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
        {metrics.map((metric, idx) => (
          <MetricItem
            key={idx}
            title={metric.title}
            value={metric.value}
            proportion={metric.proportion}
            icone={metric.icone}
          />
        ))}
      </div>

      {/* 2. Zone Intermédiaire : Graphiques et Listes (Captures 1 & 3) */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 my-6 items-start">
        <div className="lg:col-span-2 space-y-6 shadow-xs">
          <ChartCard
            data={mockPaymentsChart}
            subtitle="Received vs Due amount"
            extraInfo={
              <div className="flex gap-12 text-xs font-semibold text-slate-500">
                <div>Received Amount: <span className="block text-lg font-bold text-slate-800">$580.00</span></div>
                <div>Due Amount: <span className="block text-lg font-bold text-slate-800">$628.00</span></div>
              </div>
            }
          />
          
          {/* <ChartCard
            data={mockWeeklyProfitChart}
            subtitle="Sales vs Revenue"
          /> */}
        </div>

        <div className="lg:col-span-1 w-full shadow-xs">
          <ListData
            title="My Stocks"
            items={stocks}
            filterType="Monthly"
          />
        </div>
      </div>

      {/* 3. Zone Basse : Table de données complexe (Capture d'écran 2) */}
      <TableData
        headers={['Name', 'Position', 'Office', 'Age', 'Star Date', 'Salary']}
        items={mockTableUsers}
        renderRow={(user: UserRow, index: number) => (
          <tr key={index} className="hover:bg-slate-50/50 transition-colors border-b border-slate-100 last:border-0">
            <td className="px-6 py-4 font-semibold text-slate-800">{user.name}</td>
            <td className="px-6 py-4 text-slate-500">{user.position}</td>
            <td className="px-6 py-4 text-slate-500">{user.office}</td>
            <td className="px-6 py-4 text-slate-600">{user.age}</td>
            <td className="px-6 py-4 text-slate-500">{user.startDate}</td>
            <td className="px-6 py-4 font-bold text-slate-800">{user.salary}</td>
          </tr>
        )}
      />

    </div>
  );
}