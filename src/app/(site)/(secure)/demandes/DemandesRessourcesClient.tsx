"use client";

import Link from "next/link";
import { useState } from "react";

type ResourceWithDemandes = {
  id: string;
  designation: string;
  amount: number;
  currency: string;
  status: string;
  demandesCount: number;
  demandesPaid: number;
  demandesPending: number;
};

type Props = {
  type: "session" | "validation" | "releve" | "labo";
  typeLabel: string;
  typeIcon: string;
  sectionSlug: string;
  sectionDesignation: string;
  resources: ResourceWithDemandes[];
  initialError?: string;
  detailPath: string;
};

const TYPE_CONFIG = {
  session: {
    label: "Sessions",
    color: "blue",
    bgColor: "bg-blue-500",
    lightBg: "bg-blue-50",
    textColor: "text-blue-700",
    borderColor: "border-blue-200",
  },
  validation: {
    label: "Validations",
    color: "green",
    bgColor: "bg-green-500",
    lightBg: "bg-green-50",
    textColor: "text-green-700",
    borderColor: "border-green-200",
  },
  releve: {
    label: "Relevés",
    color: "purple",
    bgColor: "bg-purple-500",
    lightBg: "bg-purple-50",
    textColor: "text-purple-700",
    borderColor: "border-purple-200",
  },
  labo: {
    label: "Laboratoires",
    color: "amber",
    bgColor: "bg-amber-500",
    lightBg: "bg-amber-50",
    textColor: "text-amber-700",
    borderColor: "border-amber-200",
  },
};

function isPublicationActive(status: string): boolean {
  const st = (status || "").toLowerCase();
  return st === "active" || st === "published" || st === "disponible";
}

export default function DemandesRessourcesClient({
  type,
  typeLabel,
  sectionDesignation,
  resources,
  initialError,
  detailPath,
}: Props) {
  const [searchText, setSearchText] = useState("");
  const config = TYPE_CONFIG[type];

  const filteredResources = resources.filter((r) =>
    r.designation.toLowerCase().includes(searchText.toLowerCase())
  );

  const totalDemandes = resources.reduce((sum, r) => sum + r.demandesCount, 0);
  const totalPaid = resources.reduce((sum, r) => sum + r.demandesPaid, 0);
  const totalPending = resources.reduce((sum, r) => sum + r.demandesPending, 0);

  return (
    <div className="w-full min-w-0 space-y-6">
      {/* Header */}
      <header className="border-b border-gray-200 pb-4 dark:border-gray-700">
        <div className="flex items-center gap-3">
          <Link
            href="/demandes"
            className="flex h-10 w-10 items-center justify-center rounded-xl bg-gray-100 transition hover:bg-gray-200 dark:bg-gray-800 dark:hover:bg-gray-700"
          >
            <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="currentColor" className="text-gray-600 dark:text-gray-400">
              <path d="M20 11H7.83l5.59-5.59L12 4l-8 8 8 8 1.41-1.41L7.83 13H20v-2z"/>
            </svg>
          </Link>
          <div>
            <h1 className="flex items-center gap-2 text-2xl font-bold text-midnight_text dark:text-white">
              <span className={`flex h-10 w-10 items-center justify-center rounded-xl ${config.bgColor} text-white`}>
                {type === "session" && (
                  <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="currentColor">
                    <path d="M19 4h-1V2h-2v2H8V2H6v2H5c-1.11 0-1.99.9-1.99 2L3 20a2 2 0 0 0 2 2h14c1.1 0 2-.9 2-2V6c0-1.1-.9-2-2-2zm0 16H5V10h14v10zM9 14H7v-2h2v2zm4 0h-2v-2h2v2zm4 0h-2v-2h2v2zm-8 4H7v-2h2v2zm4 0h-2v-2h2v2zm4 0h-2v-2h2v2z"/>
                  </svg>
                )}
                {type === "validation" && (
                  <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="currentColor">
                    <path d="M19 3H5c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h14c1.1 0 2-.9 2-2V5c0-1.1-.9-2-2-2zm-5 14H7v-2h7v2zm3-4H7v-2h10v2zm0-4H7V7h10v2z"/>
                  </svg>
                )}
                {type === "releve" && (
                  <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="currentColor">
                    <path d="M14 2H6c-1.1 0-1.99.9-1.99 2L4 20c0 1.1.89 2 1.99 2H18c1.1 0 2-.9 2-2V8l-6-6zm2 16H8v-2h8v2zm0-4H8v-2h8v2zm-3-5V3.5L18.5 9H13z"/>
                  </svg>
                )}
                {type === "labo" && (
                  <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="currentColor">
                    <path d="M9 3L7 17H17L15 3H9zm3 14c-1.1 0-2-.9-2-2s.9-2 2-2 2 .9 2 2-.9 2-2 2zm1-6H11V7h2v4z"/>
                  </svg>
                )}
              </span>
              Demandes — {typeLabel}
            </h1>
            <div className="mt-1 text-sm text-gray-600 dark:text-gray-400">
              <p className="flex flex-wrap items-center gap-2">
                <span className="text-gray-400">Section :</span> <strong>{sectionDesignation}</strong>
              </p>
            </div>
          </div>
        </div>
      </header>

      {/* Banner Error */}
      {initialError ? (
        <div className="flex gap-3 rounded-xl border border-amber-300/80 bg-amber-50/90 px-4 py-3 text-sm text-amber-950 dark:border-amber-800 dark:bg-amber-950/40 dark:text-amber-100">
          <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="currentColor" className="mt-0.5 shrink-0">
            <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm1 15h-2v-2h2v2zm0-4h-2V7h2v6z"/>
          </svg>
          <p>{initialError}</p>
        </div>
      ) : null}

      {/* Stats */}
      <div className="grid gap-4 sm:grid-cols-3">
        <div className={`rounded-xl border ${config.borderColor} ${config.lightBg} p-4 dark:bg-opacity-10`}>
          <p className="text-sm text-gray-600 dark:text-gray-400">Total demandes</p>
          <p className={`text-2xl font-bold ${config.textColor}`}>{totalDemandes}</p>
        </div>
        <div className="rounded-xl border border-green-200 bg-green-50 p-4 dark:bg-green-900/10">
          <p className="text-sm text-gray-600 dark:text-gray-400">Payées</p>
          <p className="text-2xl font-bold text-green-700">{totalPaid}</p>
        </div>
        <div className="rounded-xl border border-amber-200 bg-amber-50 p-4 dark:bg-amber-900/10">
          <p className="text-sm text-gray-600 dark:text-gray-400">En attente</p>
          <p className="text-2xl font-bold text-amber-700">{totalPending}</p>
        </div>
      </div>

      {/* Search */}
      <div className="flex flex-col gap-4 sm:flex-row sm:flex-wrap sm:items-center sm:justify-between">
        <div>
          <h2 className="text-lg font-bold tracking-tight text-midnight_text dark:text-white">
            Ressources avec demandes
          </h2>
          <p className="mt-0.5 max-w-xl text-sm text-gray-600 dark:text-gray-400">
            Cliquez sur une ressource pour voir les détails des demandes.
          </p>
        </div>
        <div className="flex w-full flex-col gap-2 sm:w-auto sm:flex-row sm:items-center">
          <input
            type="search"
            value={searchText}
            onChange={(e) => setSearchText(e.target.value)}
            placeholder="Rechercher une ressource..."
            className="w-full min-w-[14rem] rounded-xl border border-gray-200 bg-white px-4 py-2.5 text-sm shadow-sm outline-none dark:border-gray-600 dark:bg-gray-800 dark:text-white sm:w-64"
          />
        </div>
      </div>

      {/* Resources Grid */}
      {filteredResources.length === 0 ? (
        <div className="flex flex-col items-center justify-center rounded-2xl border border-dashed border-gray-300 bg-gray-50/50 px-8 py-16 text-center dark:border-gray-600 dark:bg-gray-900/40">
          <svg xmlns="http://www.w3.org/2000/svg" width="56" height="56" viewBox="0 0 24 24" fill="currentColor" className="mb-3 text-gray-400">
            <path d="M19 3H5c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h14c1.1 0 2-.9 2-2V5c0-1.1-.9-2-2-2zm-5 14H7v-2h7v2zm3-4H7v-2h10v2zm0-4H7V7h10v2z"/>
          </svg>
          <p className="font-semibold text-midnight_text dark:text-white">Aucune ressource trouvée</p>
          <p className="mt-1 max-w-sm text-sm text-gray-500 dark:text-gray-400">
            {searchText ? "Aucun résultat pour votre recherche." : "Aucune ressource n'a encore été créée."}
          </p>
        </div>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
          {filteredResources.map((r) => {
            const active = isPublicationActive(r.status);
            return (
              <Link
                key={r.id}
                href={`/demandes/${type === "labo" ? "laboratoires" : `${type}s`}/${r.id}`}
                className="group relative flex flex-col overflow-hidden rounded-2xl border border-gray-200/90 bg-white p-5 shadow-md transition-all duration-300 hover:-translate-y-1.5 hover:border-primary/40 hover:shadow-xl dark:border-gray-700 dark:bg-gray-900"
              >
                {/* Header */}
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <span className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-[10px] font-semibold uppercase tracking-wide ${
                      active 
                        ? "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-300" 
                        : "bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-400"
                    }`}>
                      {active ? "Active" : "Inactive"}
                    </span>
                  </div>
                  <span className="inline-flex items-center gap-1.5 rounded-lg bg-gray-100 px-2.5 py-1 text-xs font-semibold dark:bg-gray-800">
                    <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="currentColor" className="text-primary">
                      <path d="M11.8 10.9c-2.27-.59-3-1.2-3-2.15 0-1.09 1.01-1.85 2.7-1.85 1.78 0 2.44.85 2.5 2.1h2.21c-.07-1.72-1.12-3.3-3.21-3.81V3h-3v2.16c-1.94.42-3.5 1.68-3.5 3.61 0 2.31 1.91 3.46 4.7 4.13 2.5.6 3 1.48 3 2.41 0 .69-.49 1.79-2.7 1.79-2.06 0-2.87-.92-2.98-2.1h-2.2c.12 2.19 1.76 3.42 3.68 3.83V21h3v-2.15c1.95-.37 3.5-1.5 3.5-3.55 0-2.84-2.43-3.81-4.7-4.4z"/>
                    </svg>
                    {r.amount} {r.currency}
                  </span>
                </div>

                {/* Title */}
                <h3 className="mt-3 line-clamp-2 text-base font-bold leading-snug text-midnight_text dark:text-white">
                  {r.designation}
                </h3>
                <p className="mt-1 font-mono text-[11px] text-gray-400">
                  #{r.id.slice(-8)}
                </p>

                {/* Demandes Stats */}
                <div className="mt-4 grid grid-cols-3 gap-2">
                  <div className="rounded-lg bg-gray-50 p-2 text-center dark:bg-gray-800">
                    <p className="text-lg font-bold text-midnight_text dark:text-white">{r.demandesCount}</p>
                    <p className="text-[10px] uppercase tracking-wide text-gray-500">Total</p>
                  </div>
                  <div className="rounded-lg bg-green-50 p-2 text-center dark:bg-green-900/20">
                    <p className="text-lg font-bold text-green-700">{r.demandesPaid}</p>
                    <p className="text-[10px] uppercase tracking-wide text-green-600">Payées</p>
                  </div>
                  <div className="rounded-lg bg-amber-50 p-2 text-center dark:bg-amber-900/20">
                    <p className="text-lg font-bold text-amber-700">{r.demandesPending}</p>
                    <p className="text-[10px] uppercase tracking-wide text-amber-600">En attente</p>
                  </div>
                </div>

                {/* Action */}
                <div className="mt-4 flex items-center justify-between border-t border-gray-100 pt-4 dark:border-gray-800">
                  <span className="text-xs text-gray-500 dark:text-gray-400">
                    Voir les demandes
                  </span>
                  <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="currentColor" className="text-primary transition-transform group-hover:translate-x-1">
                    <path d="M8.59 16.59L13.17 12 8.59 7.41 10 6l6 6-6 6-1.41-1.41z"/>
                  </svg>
                </div>
              </Link>
            );
          })}
        </div>
      )}
    </div>
  );
}
