// src/components/dashboard/ChartCard.tsx
'use client';

import { ChartSerie } from '@/lib/services/loadDashboardDataByRole';
import React from 'react';
import {
  ResponsiveContainer,
  AreaChart,
  Area,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
} from 'recharts';

export interface ChartData {
  x: string[];
  y: number[];
  y2?: number[]; // Deuxième série optionnelle (ex: Due Amount ou Revenue)
  z: { slug: 'line' | 'bar'; title: string };
}

interface ChartCardProps {
  data: ChartSerie;
  subtitle?: string;
  extraInfo?: React.ReactNode;
}

// Composant personnalisé pour le Tooltip (Label au survol)
const CustomTooltip = ({ active, payload, label }: any) => {
  if (active && payload && payload.length) {
    return (
      <div className="bg-slate-900 text-white p-3 rounded-xl shadow-xl border border-slate-800 text-xs font-medium space-y-1">
        <p className="text-slate-400 font-bold mb-1">{label}</p>
        {payload.map((entry: any, index: number) => (
          <div key={index} className="flex items-center gap-2">
            <span 
              className="w-2 h-2 rounded-full" 
              style={{ backgroundColor: entry.color || entry.fill }} 
            />
            <span className="capitalize">{entry.name}:</span>
            <span className="font-bold">{entry.value}</span>
          </div>
        ))}
      </div>
    );
  }
  return null;
};

export const ChartCard: React.FC<ChartCardProps> = ({ data, subtitle, extraInfo }) => {
  const { x, y, y2, z } = data;

  // Transformation des données pour le format attendu par Recharts
  const formattedData = x.map((label, index) => ({
    name: label,
    Valeur1: y[index],
    ...(y2 ? { Valeur2: y2[index] } : {}),
  }));

  const isLine = z.slug === 'line';

  return (
    <div className="bg-white p-6 rounded-2xl border border-slate-100 flex-1 shadow-md min-w-[320px]">
      {/* Entête du graphique */}
      <div className="flex justify-between items-center mb-6">
        <div>
          <h3 className="text-lg font-bold text-slate-800">{z.title}</h3>
          {subtitle && <p className="text-xs text-slate-400">{subtitle}</p>}
        </div>
        <select className="text-xs font-medium text-slate-500 bg-slate-50 border border-slate-200 rounded-lg px-2.5 py-1.5 outline-none cursor-pointer">
          <option>Weekly</option>
          <option>Monthly</option>
        </select>
      </div>

      {/* Conteneur de Graphique Réactif */}
      <div className="w-full h-[220px] text-[11px] font-medium text-slate-400">
        <ResponsiveContainer width="100%" height="100%">
          {isLine ? (
            <AreaChart data={formattedData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
              <defs>
                <linearGradient id="colorValue1" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.2} />
                  <stop offset="95%" stopColor="#3b82f6" stopOpacity={0} />
                </linearGradient>
                <linearGradient id="colorValue2" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#06b6d4" stopOpacity={0.2} />
                  <stop offset="95%" stopColor="#06b6d4" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="4 4" stroke="#f1f5f9" vertical={false} />
              <XAxis dataKey="name" tickLine={false} stroke="#94a3b8" />
              <YAxis tickLine={false} stroke="#94a3b8" />
              <Tooltip content={<CustomTooltip />} cursor={{ stroke: '#cbd5e1', strokeWidth: 1, strokeDasharray: '4 4' }} />
              
              <Area
                name="Série 1"
                type="monotone"
                dataKey="Valeur1"
                stroke="#3b82f6"
                strokeWidth={3}
                fillOpacity={1}
                fill="url(#colorValue1)"
                animationDuration={800}
              />
              {y2 && (
                <Area
                  name="Série 2"
                  type="monotone"
                  dataKey="Valeur2"
                  stroke="#06b6d4"
                  strokeWidth={3}
                  fillOpacity={1}
                  fill="url(#colorValue2)"
                  animationDuration={800}
                />
              )}
            </AreaChart>
          ) : (
            /* Mode Bar Chart */
            <BarChart data={formattedData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
              <CartesianGrid strokeDasharray="4 4" stroke="#f1f5f9" vertical={false} />
              <XAxis dataKey="name" tickLine={false} stroke="#94a3b8" />
              <YAxis tickLine={false} stroke="#94a3b8" />
              <Tooltip content={<CustomTooltip />} cursor={{ fill: '#f8fafc', opacity: 0.6 }} />
              
              <Bar
                name="Sales"
                dataKey="Valeur1"
                fill="#3b82f6"
                radius={[4, 4, 0, 0]}
                maxBarSize={16}
                animationDuration={800}
              />
              {y2 && (
                <Bar
                  name="Revenue"
                  dataKey="Valeur2"
                  fill="#06b6d4"
                  radius={[4, 4, 0, 0]}
                  maxBarSize={16}
                  animationDuration={800}
                />
              )}
            </BarChart>
          )}
        </ResponsiveContainer>
      </div>

      {/* Informations extra en bas (ex: Received / Due amount) */}
      {extraInfo && <div className="mt-4 pt-4 border-t border-slate-50">{extraInfo}</div>}
    </div>
  );
};