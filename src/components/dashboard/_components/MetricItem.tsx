// src/components/dashboard/MetricItem.tsx
import React, { ReactNode } from 'react';
import { motion } from 'framer-motion';

export interface Metrique {
  icone: ReactNode;
  value: number | string; // Permet de passer "$4.2K" ou "3.5K" directement
  unit?: string;
  title: string;
  proportion: number; // Positif pour la hausse, négatif pour la baisse
}

export const MetricItem: React.FC<Metrique> = ({
  icone,
  value,
  unit = '',
  title,
  proportion,
}) => {
  const isPositive = proportion >= 0;

  return (
    <div className="bg-white p-6 rounded-2xl border border-slate-100 shadow-md flex items-center justify-between min-w-[240px] flex-1">
      <div className="space-y-3">
        <div className="text-sm font-medium text-slate-500">{title}</div>
        <div className="flex items-baseline gap-1">
          <span className="text-3xl font-bold text-slate-900">{value}</span>
          {unit && <span className="text-sm font-medium text-slate-500">{unit}</span>}
        </div>
        <div className="flex items-center gap-1.5">
          <span
            className={`text-xs font-semibold px-2 py-0.5 rounded-full flex items-center gap-0.5 ${
              isPositive ? 'bg-emerald-50 text-emerald-600' : 'bg-rose-50 text-rose-600'
            }`}
          >
            {isPositive ? '▲' : '▼'} {Math.abs(proportion)}%
          </span>
        </div>
      </div>
      <div className="p-4 rounded-full bg-slate-50 text-slate-700 flex items-center justify-center">
        {icone}
      </div>
    </div>
  );
};