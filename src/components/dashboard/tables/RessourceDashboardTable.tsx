'use client';

import React, { useState, useMemo } from 'react';
import Link from 'next/link';
import { motion, AnimatePresence } from 'framer-motion';
import { Icon } from '@iconify/react';

// --- Définition des types basés sur votre structure JSON ---
interface Category {
  slug: string;
  title: string;
}

interface Branding {
  institut: string;
  section: string;
  chef: string;
  email: string;
}

interface ResourceItem {
  _id: string;
  categorie: string;
  designation: string;
  amount: number;
  currency: string;
  status: 'active' | 'inactive' | string;
  createdAt: string;
  branding?: Branding;
  programme?: {
    classe: string;
    filiere: string;
  };
}

interface TableDataGroup {
  slug: string;
  data: {
    data: ResourceItem[];
    total: number;
  };
}

interface SectionDashboardProps {
  role: string;
  categories: Category[];
  tableData: TableDataGroup[];
}

const ResourceDashboardTable: React.FC<SectionDashboardProps> = ({
  categories,
  tableData,
}) => {
  // Sélection de la catégorie courante (initialisée sur le premier slug disponible)
  const [activeTab, setActiveTab] = useState<string>(categories[0]?.slug || '');
  // État pour la recherche textuelle
  const [searchQuery, setSearchQuery] = useState<string>('');

  // 1. Récupération des données liées à la catégorie active
  const currentCategoryData = useMemo(() => {
    const group = tableData.find((item) => item.slug === activeTab);
    return group?.data?.data || [];
  }, [activeTab, tableData]);

  // 2. Filtrage en temps réel avec la barre de recherche
  const filteredItems = useMemo(() => {
    if (!searchQuery.trim()) return currentCategoryData;
    return currentCategoryData.filter((item) =>
      item.designation.toLowerCase().includes(searchQuery.toLowerCase()) ||
      item.programme?.filiere?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      item._id.toLowerCase().includes(searchQuery.toLowerCase())
    );
  }, [searchQuery, currentCategoryData]);

  return (
    <div className="w-full bg-white rounded-2xl border border-slate-100 shadow-xl overflow-hidden felt-blur">
      
      {/* ─── BARRE SUPÉRIEURE : EN-TÊTE & RECHERCHE ─── */}
      <div className="p-6 border-b border-slate-50 bg-slate-50/40 flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold text-slate-800 tracking-tight flex items-center gap-2">
            <Icon icon="mdi:folder-table-outline" className="text-indigo-600 w-6 h-6" />
            Ressources de Section
          </h2>
          <p className="text-xs text-slate-400 font-medium mt-0.5">
            Sélectionnez une catégorie pour superviser et traiter les demandes associées.
          </p>
        </div>

        {/* Input de recherche stylisé */}
        <div className="relative w-full md:w-80">
          <Icon 
            icon="mdi:magnify" 
            className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 w-5 h-5" 
          />
          <input
            type="text"
            placeholder="Rechercher une ressource..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-11 pr-4 py-2.5 bg-white border border-slate-200 rounded-xl text-sm font-medium text-slate-700 placeholder-slate-400 focus:outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/10 transition-all shadow-sm"
          />
          {searchQuery && (
            <button 
              onClick={() => setSearchQuery('')}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 transition-colors"
            >
              <Icon icon="mdi:close-circle" className="w-4 h-4" />
            </button>
          )}
        </div>
      </div>

      {/* ─── NAVIGATION PAR ONGLETS (CATEGORIES) ─── */}
      <div className="px-6 pt-4 border-b border-slate-100 bg-white overflow-x-auto scrollbar-none flex gap-2">
        {categories.map((cat) => {
          const isActive = cat.slug === activeTab;
          return (
            <button
              key={cat.slug}
              onClick={() => {
                setActiveTab(cat.slug);
                setSearchQuery(''); // Reset recherche au changement d'onglet
              }}
              className={`relative px-4 py-3 text-sm font-bold transition-all whitespace-nowrap cursor-pointer rounded-t-xl ${
                isActive ? 'text-indigo-600' : 'text-slate-500 hover:text-slate-800'
              }`}
            >
              <span className="relative z-10">{cat.title}</span>
              {isActive && (
                <motion.div
                  layoutId="activeCategoryBorder"
                  className="absolute bottom-0 left-0 right-0 h-0.5 bg-indigo-600"
                  transition={{ type: 'spring', stiffness: 380, damping: 30 }}
                />
              )}
            </button>
          );
        })}
      </div>

      {/* ─── TABLEAU DES RESSOURCES ANIME ─── */}
      <div className="overflow-x-auto w-full">
        <table className="w-full text-left border-collapse">
          <thead>
            <tr className="border-b border-slate-100 bg-slate-50/50 text-[11px] font-bold tracking-wider text-slate-400 uppercase">
              <th className="py-4 px-6">Désignation / ID</th>
              <th className="py-4 px-4">Classe & Filière</th>
              <th className="py-4 px-4">Frais standard</th>
              <th className="py-4 px-4 text-center">Statut</th>
              <th className="py-4 px-6 text-right">Actions</th>
            </tr>
          </thead>
          
          <tbody className="divide-y divide-slate-50 text-sm font-medium text-slate-700">
            <AnimatePresence mode="popLayout">
              {filteredItems.length > 0 ? (
                filteredItems.map((item) => (
                  <motion.tr
                    key={item._id}
                    layout
                    initial={{ opacity: 0, y: 12 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, x: -10 }}
                    transition={{ duration: 0.2 }}
                    className="hover:bg-slate-50/40 transition-colors group"
                  >
                    {/* Désignation et ID technique */}
                    <td className="py-4 px-6">
                      <div className="max-w-md">
                        <div className="font-bold text-slate-800 group-hover:text-indigo-600 transition-colors capitalize line-clamp-1">
                          {item.designation.toLowerCase()}
                        </div>
                        <div className="text-[10px] font-mono font-semibold text-slate-400 mt-0.5 tracking-wider">
                          ID: {item._id}
                        </div>
                      </div>
                    </td>

                    {/* Classe & Filière (si applicable, ex: Fiches de validation / Relevés) */}
                    <td className="py-4 px-4 text-slate-600 font-semibold">
                      {item.programme ? (
                        <div className="flex items-center gap-1.5">
                          <span className="px-2 py-0.5 bg-slate-100 rounded text-xs font-bold text-slate-700">
                            {item.programme.classe}
                          </span>
                          <span className="text-xs uppercase text-slate-400 font-bold">
                            {item.programme.filiere.replace('l1-', 'L1 ').replace('l2-', 'L2 ')}
                          </span>
                        </div>
                      ) : (
                        <span className="text-xs text-slate-300 font-normal italic">Général Section</span>
                      )}
                    </td>

                    {/* Montant Financier */}
                    <td className="py-4 px-4 font-bold text-slate-800">
                      {item.amount} <span className="text-xs text-indigo-500 font-extrabold">{item.currency}</span>
                    </td>

                    {/* Badge de Statut */}
                    <td className="py-4 px-4 text-center">
                      <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-bold capitalize ${
                        item.status === 'active' 
                          ? 'bg-emerald-50 text-emerald-600 border border-emerald-100' 
                          : 'bg-slate-50 text-slate-400 border border-slate-200'
                      }`}>
                        <span className={`w-1.5 h-1.5 rounded-full ${item.status === 'active' ? 'bg-emerald-500' : 'bg-slate-300'}`} />
                        {item.status === 'active' ? 'Actif' : 'Inactif'}
                      </span>
                    </td>

                    {/* Bouton de redirection vers la route dynamique */}
                    <td className="py-4 px-6 text-right">
                      <Link
                        href={`/demandes/${activeTab}/${item._id}`}
                        className="inline-flex items-center justify-center w-9 h-9 text-slate-400 hover:text-indigo-600 bg-white hover:bg-indigo-50 rounded-xl border border-slate-200 hover:border-indigo-100 shadow-sm transition-all cursor-pointer group/btn"
                        title="Consulter les demandes"
                      >
                        <Icon 
                          icon="mdi:arrow-right-box" 
                          className="w-5 h-5 transition-transform group-hover/btn:translate-x-0.5" 
                        />
                      </Link>
                    </td>
                  </motion.tr>
                ))
              ) : (
                /* ─── ZONE VIDE / AUCUNE DONNÉE TROUVÉE ─── */
                <motion.tr
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  className="bg-white"
                >
                  <td colSpan={5} className="py-16 text-center">
                    <div className="flex flex-col items-center justify-center max-w-xs mx-auto">
                      <div className="w-12 h-12 bg-slate-50 rounded-2xl flex items-center justify-center text-slate-400 mb-4 border border-slate-100">
                        <Icon icon="mdi:database-search-outline" className="w-6 h-6" />
                      </div>
                      <h3 className="text-sm font-bold text-slate-700">Aucun élément trouvé</h3>
                      <p className="text-xs text-slate-400 font-medium mt-1">
                        {searchQuery 
                          ? `Aucun résultat pour "${searchQuery}" dans cette catégorie.` 
                          : "Aucune ressource n'est actuellement répertoriée dans cette catégorie."}
                      </p>
                    </div>
                  </td>
                </motion.tr>
              )}
            </AnimatePresence>
          </tbody>
        </table>
      </div>
      
      {/* ─── PIED DE PAGE : TOTALISATEUR STATISTIQUE ─── */}
      <div className="p-4 bg-slate-50/50 border-t border-slate-100 px-6 text-xs font-bold text-slate-400 flex justify-between items-center">
        <div>
          Total affiché : {filteredItems.length} ressource(s)
        </div>
        <div className="text-indigo-500 font-semibold uppercase tracking-wider text-[10px]">
          Management INBTP
        </div>
      </div>
    </div>
  );
};

export default ResourceDashboardTable;