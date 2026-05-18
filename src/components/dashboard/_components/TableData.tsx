// src/components/dashboard/TableData.tsx
'use client';

import React, { ReactNode, useState, useMemo } from 'react';

interface CategoryOption {
  slug: string;
  designation: string;
}

interface TableDataProps {
  headers: string[];
  renderRow: (item: any, index: number, selectedCategorySlug: string) => ReactNode;
  items: any[];
  categories: CategoryOption[];
  searchPlaceholder?: string;
  searchKey?: string; // Clé sur laquelle appliquer la recherche textuelle (ex: 'designation')
}

export const TableData: React.FC<TableDataProps> = ({
  headers,
  renderRow,
  items,
  categories,
  searchPlaceholder = 'Rechercher...',
  searchKey = 'designation',
}) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategory, setSelectedCategory] = useState(categories[0]?.slug || '');
  const [perPage, setPerPage] = useState(10);
  const [currentPage, setCurrentPage] = useState(1);

  // Méthode de filtrage combinée (Recherche + Catégorie/Année active)
  const filteredItems = useMemo(() => {
    return items.filter((item) => {
      const matchesSearch = item[searchKey]
        ?.toLowerCase()
        .includes(searchTerm.toLowerCase());
      
      // Ici, la table filtre sur la base de la catégorie sélectionnée si besoin
      return matchesSearch;
    });
  }, [items, searchTerm, searchKey]);

  // Pagination locale
  const paginatedItems = useMemo(() => {
    const start = (currentPage - 1) * perPage;
    return filteredItems.slice(start, start + perPage);
  }, [filteredItems, currentPage, perPage]);

  const totalPages = Math.ceil(filteredItems.length / perPage) || 1;

  return (
    <div className="bg-white rounded-2xl border border-slate-100 shadow-md overflow-hidden w-full">
      {/* Contôles du Header : Recherche & Dropdown dynamique */}
      <div className="p-5 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 border-b border-slate-100">
        <div className="flex flex-1 w-full sm:w-auto items-center gap-3">
          {/* Input de recherche globale */}
          <div className="relative w-full sm:w-72">
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => { setSearchTerm(e.target.value); setCurrentPage(1); }}
              placeholder={searchPlaceholder}
              className="w-full bg-slate-50 text-slate-700 text-sm pl-4 pr-10 py-2 rounded-xl border border-slate-200 focus:outline-none focus:border-indigo-500 transition-colors"
            />
            <span className="absolute right-3.5 top-2.5 text-slate-400 text-sm">🔍</span>
          </div>

          {/* Dropdown dynamique des catégories (Années Académiques) */}
          {categories.length > 0 && (
            <div className="flex items-center gap-2">
              <select
                value={selectedCategory}
                onChange={(e) => setSelectedCategory(e.target.value)}
                className="bg-slate-50 border border-slate-200 text-slate-700 text-sm rounded-xl px-3 py-2 outline-none focus:border-indigo-500 transition-colors"
              >
                {categories.map((cat) => (
                  <option key={cat.slug} value={cat.slug}>
                    {cat.designation}
                  </option>
                ))}
              </select>
            </div>
          )}
        </div>

        <div className="flex items-center gap-2 text-xs font-medium text-slate-500 direct-pagination">
          <span>Par page:</span>
          <select 
            value={perPage} 
            onChange={(e) => { setPerPage(Number(e.target.value)); setCurrentPage(1); }}
            className="bg-slate-50 border border-slate-200 rounded-lg px-2 py-1 outline-none"
          >
            <option value={5}>5</option>
            <option value={10}>10</option>
            <option value={25}>25</option>
            <option value={50}>50</option>
          </select>
        </div>
      </div>

      {/* Rendu principal de la table */}
      <div className="overflow-x-auto w-full">
        <table className="w-full text-left border-collapse">
          <thead>
            <tr className="bg-slate-50/50 border-b border-slate-100">
              {headers.map((header, idx) => (
                <th
                  key={idx}
                  className="px-6 py-4 text-xs font-bold text-slate-400 uppercase tracking-wider"
                >
                  <div className="flex items-center gap-1.5">
                    {header}
                  </div>
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100 text-sm text-slate-600">
            {paginatedItems.length > 0 ? (
              paginatedItems.map((item, index) => renderRow(item, index, selectedCategory))
            ) : (
              <tr>
                <td colSpan={headers.length} className="px-6 py-10 text-center text-slate-400 italic">
                  Aucun programme trouvé correspondant aux critères.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {/* Footer de Pagination */}
      <div className="p-5 border-t border-slate-100 flex justify-between items-center text-xs text-slate-400 font-medium">
        <div>
          Affichage de {filteredItems.length > 0 ? (currentPage - 1) * perPage + 1 : 0} à{' '}
          {Math.min(currentPage * perPage, filteredItems.length)} sur {filteredItems.length} élément(s)
        </div>
        
        {totalPages > 1 && (
          <div className="flex items-center gap-1">
            <button 
              disabled={currentPage === 1}
              onClick={() => setCurrentPage(p => Math.max(p - 1, 1))}
              className="p-1.5 rounded-lg hover:bg-slate-50 text-slate-400 disabled:opacity-40"
            >
              ◀
            </button>
            {Array.from({ length: totalPages }, (_, i) => i + 1).map((page) => (
              <button
                key={page}
                onClick={() => setCurrentPage(page)}
                className={`w-7 h-7 rounded-lg font-bold transition-all ${
                  currentPage === page 
                    ? 'bg-indigo-600 text-white shadow-xs' 
                    : 'hover:bg-slate-50 text-slate-600'
                }`}
              >
                {page}
              </button>
            ))}
            <button 
              disabled={currentPage === totalPages}
              onClick={() => setCurrentPage(p => Math.min(p + 1, totalPages))}
              className="p-1.5 rounded-lg hover:bg-slate-50 text-slate-400 disabled:opacity-40"
            >
              ▶
            </button>
          </div>
        )}
      </div>
    </div>
  );
};