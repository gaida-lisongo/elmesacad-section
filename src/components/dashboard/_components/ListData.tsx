'use client';

import React, { useState, useRef, useEffect } from 'react';
import Link from 'next/link';
import { Icon } from '@iconify/react';
import { WhiteListItem } from "@/lib/services/loadDashboardDataByRole";

interface ListDataProps {
  items: { categorie: string; list: WhiteListItem[] };
}

export const ListData: React.FC<ListDataProps> = ({ items }) => {
  // 1. Initialiser avec la première catégorie disponible ou une chaîne vide
  const [currentCategory, setCurrentCategory] = useState<string>(items?.categorie || '');
  const [isDropdownOpen, setIsDropdownOpen] = useState<boolean>(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  // 2. Récupérer toutes les catégories uniques disponibles pour le dropdown
  const categoriesList = items?.list ?? [];

  // 3. Trouver la liste des items liés uniquement à la catégorie courante
  const currentCategoryData = [items].find(
    (group) => group.categorie.toLowerCase() === currentCategory.toLowerCase()
  );
  
  const displayedList = currentCategoryData ? currentCategoryData.list : [];

  // Fermer le menu déroulant si on clique en dehors du composant
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsDropdownOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  return (
    <div className="bg-white p-6 rounded-2xl border border-slate-100 w-full shadow-md">
      
      {/* Entête du volet avec Titre Dynamique & Bouton Dropdown */}
      <div className="flex justify-between items-center mb-6 relative" ref={dropdownRef}>
        {/* Titre : Majuscule sur la première lettre de la catégorie courante */}
        <h3 className="text-lg font-bold text-slate-800 capitalize">
          {currentCategory || "Modalités"}
        </h3>
        
        {/* Bouton d'action transformé en Trigger Dropdown */}
        <button
          onClick={() => setIsDropdownOpen(!isDropdownOpen)}
          className="flex items-center gap-1.5 text-xs font-bold text-indigo-600 bg-indigo-50/60 hover:bg-indigo-100 px-3 py-2 rounded-xl border border-indigo-100/30 transition-all cursor-pointer"
        >
          <span>Afficher tout</span>
          <Icon 
            icon="mdi:chevron-down" 
            className={`w-4 h-4 transition-transform duration-200 ${isDropdownOpen ? 'rotate-180' : ''}`} 
          />
        </button>

        {/* Menu Dropdown flottant */}
        {isDropdownOpen && (
          <div className="absolute right-0 top-11 w-48 bg-white border border-slate-100 rounded-xl shadow-xl z-30 py-1.5 animate-in fade-in slide-in-from-top-2 duration-150">
            <div className="px-3 py-1 text-[10px] font-bold text-slate-400 uppercase tracking-wider border-b border-slate-50 mb-1">
              Filtrer par catégorie
            </div>
            {categoriesList.map((cat, idx) => (
              <button
                key={idx}
                onClick={() => {
                  setCurrentCategory(cat?.title || '');
                  setIsDropdownOpen(false);
                }}
                className={`w-full text-left px-4 py-2 text-xs font-semibold flex items-center justify-between transition-colors cursor-pointer ${
                  cat?.title?.toLowerCase() === currentCategory.toLowerCase()
                    ? 'text-indigo-600 bg-indigo-50/50'
                    : 'text-slate-600 hover:bg-slate-50'
                }`}
              >
                <span className="capitalize">{cat?.title || cat?.title}</span>
                {cat?.title?.toLowerCase() === currentCategory.toLowerCase() && (
                  <Icon icon="mdi:check" className="w-3.5 h-3.5 text-indigo-600" />
                )}
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Liste filtrée dynamique */}
      <div className="divide-y divide-slate-50 max-h-[400px] overflow-y-auto pr-1 scrollbar-thin">
        {displayedList.length > 0 ? (
          displayedList.map((item: WhiteListItem, index: number) => {
            const isPositive = item.proportion >= 0;
            
            // Conteneur de l'élément de liste (Rend le clic optionnel si une URL est fournie)
            const RowWrapper = item.url ? Link : 'div';
            const wrapperProps = item.url ? { href: item.url, className: "flex items-center justify-between py-3.5 first:pt-0 last:pb-0 hover:bg-slate-50/50 px-1 rounded-xl transition-colors group" } : { className: "flex items-center justify-between py-3.5 first:pt-0 last:pb-0" };

            return (
              // @ts-ignore
              <RowWrapper key={index} {...wrapperProps}>
                <div className="flex items-center gap-3.5">
                  {/* Avatar d'icône */}
                  <div className="w-10 h-10 rounded-full bg-slate-50 flex items-center justify-center text-slate-500 font-semibold overflow-hidden group-hover:bg-white border group-hover:border-slate-100 transition-all">
                    {typeof item.icon === 'string' ? (
                      <Icon icon={item.icon} className="w-5 h-5 text-indigo-500" />
                    ) : (
                      item.icon
                    )}
                  </div>
                  
                  {/* Labels textuels */}
                  <div>
                    <h4 className="text-sm font-bold text-slate-800 group-hover:text-indigo-600 transition-colors line-clamp-1">
                      {item.title}
                    </h4>
                    <p className="text-xs text-slate-400 font-medium flex items-center gap-1.5 mt-0.5">
                      <span className={`w-1.5 h-1.5 rounded-full ${item.description === 'active' ? 'bg-emerald-500' : 'bg-slate-300'}`}></span>
                      <span className="capitalize">{item.description}</span>
                    </p>
                  </div>
                </div>

                {/* Valeurs et indicateurs de proportions financiers */}
                <div className="text-right pl-2 shrink-0">
                  <div className="text-sm font-bold text-slate-800">
                    {item.value}
                  </div>
                  <span className={`text-[11px] font-semibold ${isPositive ? 'text-emerald-500' : 'text-rose-500'}`}>
                    {isPositive ? '+' : ''}{item.proportion}%
                  </span>
                </div>
              </RowWrapper>
            );
          })
        ) : (
          <div className="py-8 text-center text-xs text-slate-400 italic">
            Aucun élément répertorié dans cette catégorie.
          </div>
        )}
      </div>
    </div>
  );
};