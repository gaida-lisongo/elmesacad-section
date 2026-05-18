// src/components/dashboard/ListData.tsx
import React, { ReactNode } from 'react';

export interface ListItem {
  url?: string;
  icon: ReactNode;
  title: string;
  description: string;
  value: number | string;
  unit?: string;
  proportion: number;
}

interface ListDataProps {
  title: string;
  items: ListItem[];
  filterType?: string;
}

export const ListData: React.FC<ListDataProps> = ({ title, items, filterType = 'Monthly' }) => {
  return (
    <div className="bg-white p-6 rounded-2xl border border-slate-100 shadow-xs w-full max-w-md">
      <div className="flex justify-between items-center mb-6">
        <h3 className="text-lg font-bold text-slate-800">{title}</h3>
        <span className="text-xs font-semibold text-slate-400 bg-slate-50 px-2.5 py-1.5 rounded-lg border border-slate-100">
          {filterType}
        </span>
      </div>

      <div className="divide-y divide-slate-50 max-h-[400px] overflow-y-auto pr-1">
        {items.map((item, index) => {
          const isPositive = item.proportion >= 0;
          return (
            <div key={index} className="flex items-center justify-between py-3.5 first:pt-0 last:pb-0">
              <div className="flex items-center gap-3.5">
                <div className="w-10 h-10 rounded-full bg-slate-50 flex items-center justify-center text-slate-700 font-semibold overflow-hidden">
                  {item.icon}
                </div>
                <div>
                  <h4 className="text-sm font-bold text-slate-800">{item.title}</h4>
                  <p className="text-xs text-slate-400">{item.description}</p>
                </div>
              </div>

              <div className="text-right">
                <div className="text-sm font-bold text-slate-800">
                  {item.value} <span className="text-[11px] font-normal text-slate-400">{item.unit}</span>
                </div>
                <span className={`text-[11px] font-medium ${isPositive ? 'text-emerald-500' : 'text-rose-500'}`}>
                  {isPositive ? '+' : ''}{item.proportion}%
                </span>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};