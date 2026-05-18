// src/components/dashboard/TableData.tsx
import React, { ReactNode } from 'react';

interface TableDataProps {
  headers: string[];
  renderRow: (item: any, index: number) => ReactNode;
  items: any[];
  searchPlaceholder?: string;
}

export const TableData: React.FC<TableDataProps> = ({
  headers,
  renderRow,
  items,
  searchPlaceholder = 'Search here...',
}) => {
  return (
    <div className="bg-white rounded-2xl border border-slate-100 shadow-xs overflow-hidden w-full">
      {/* Table Header Filter controls */}
      <div className="p-5 flex justify-between items-center gap-4 border-b border-slate-100">
        <div className="relative w-72">
          <input
            type="text"
            placeholder={searchPlaceholder}
            className="w-full bg-slate-50 text-slate-700 text-sm pl-4 pr-10 py-2 rounded-xl border border-slate-200 focus:outline-none focus:border-indigo-500 transition-colors"
          />
          <span className="absolute right-3.5 top-2.5 text-slate-400 text-sm">🔍</span>
        </div>
        <div className="flex items-center gap-2 text-xs font-medium text-slate-500">
          <span>Per Page:</span>
          <select className="bg-slate-50 border border-slate-200 rounded-lg px-2 py-1 outline-none">
            <option>10</option>
            <option>25</option>
            <option>50</option>
          </select>
        </div>
      </div>

      {/* Main Table Elements */}
      <div className="overflow-x-auto w-full">
        <table className="w-full text-left border-collapse">
          <thead>
            <tr className="bg-slate-50/50 border-b border-slate-100">
              {headers.map((header, idx) => (
                <th
                  key={idx}
                  className="px-6 py-4 text-xs font-bold text-slate-400 uppercase tracking-wider cursor-pointer hover:text-slate-600 transition-colors"
                >
                  <div className="flex items-center gap-1.5">
                    {header}
                    <span className="text-[10px] text-slate-300">⇅</span>
                  </div>
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100 text-sm text-slate-600">
            {items.map((item, index) => renderRow(item, index))}
          </tbody>
        </table>
      </div>

      {/* Pagination Footer */}
      <div className="p-5 border-t border-slate-100 flex justify-between items-center text-xs text-slate-400 font-medium">
        <div>Showing 1 to {items.length} of {items.length} pages</div>
        <div className="flex items-center gap-1">
          <button className="p-1.5 rounded-lg hover:bg-slate-50 text-slate-300">◀</button>
          <button className="w-7 h-7 bg-indigo-600 text-white rounded-lg font-bold shadow-xs">1</button>
          <button className="w-7 h-7 hover:bg-slate-50 text-slate-600 rounded-lg">2</button>
          <button className="w-7 h-7 hover:bg-slate-50 text-slate-600 rounded-lg">3</button>
          <button className="p-1.5 rounded-lg hover:bg-slate-50 text-slate-400">▶</button>
        </div>
      </div>
    </div>
  );
};