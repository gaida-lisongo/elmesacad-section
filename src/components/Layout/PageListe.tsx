"use client";

import type { ReactNode } from "react";

export type PageListeProps = {
  /** Titre principal de la page (h1 ou bloc d’intro). */
  heading?: ReactNode;
  /** Actions à droite du bandeau (ex. boutons). */
  toolbar?: ReactNode;
  /**
   * Colonne latérale (ex. cartes recherche, semestre, liste).
   * Si défini : pas de champ recherche pleine largeur en tête ; le contenu principal suit à droite (style proche du blog).
   */
  sidebar?: ReactNode;
  placeholder?: string;
  searchValue?: string;
  onSearchChange?: (value: string) => void;
  /** Contenu principal : en général une grille de cartes ou de `PageListeCategoryCard`. */
  children: ReactNode;
  className?: string;
};

/**
 * Mise en page « liste » : recherche en tête (sans sidebar), ou colonne latérale + zone principale.
 * Les cartes par catégorie utilisent `PageListeCategoryCard`.
 */
export function PageListe({
  heading,
  toolbar,
  sidebar,
  placeholder = "Rechercher…",
  searchValue = "",
  onSearchChange,
  children,
  className = "",
}: PageListeProps) {
  const showTopSearch = !sidebar && onSearchChange;

  return (
    <div
      className={`container mx-auto w-full px-4 md:max-w-(--breakpoint-md) lg:max-w-(--breakpoint-xl) ${className}`.trim()}
    >
      <div className="space-y-6 lg:space-y-8">
        {(heading || toolbar) && (
          <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
            {heading ? <div className="min-w-0 flex-1">{heading}</div> : null}
            {toolbar ? <div className="flex shrink-0 flex-wrap gap-2">{toolbar}</div> : null}
          </div>
        )}

        <div
          className={
            sidebar
              ? "flex flex-col gap-8 lg:flex-row lg:items-start lg:gap-10"
              : "space-y-4"
          }
        >
          {sidebar ? (
            <aside className="w-full shrink-0 space-y-4 lg:sticky lg:top-4 lg:w-80">{sidebar}</aside>
          ) : null}

          <div className="min-w-0 flex-1 space-y-4">
            {showTopSearch ? (
              <div className="rounded-xl border border-gray-200 bg-white p-3 shadow-sm dark:border-gray-800 dark:bg-gray-900/40 sm:p-4">
                <label className="block text-xs font-medium text-gray-600 dark:text-gray-400">
                  Recherche
                  <input
                    type="search"
                    value={searchValue}
                    onChange={(e) => onSearchChange(e.target.value)}
                    placeholder={placeholder}
                    className="mt-1 w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm text-midnight_text shadow-sm placeholder:text-gray-400 focus:border-[#082b1c] focus:outline-none focus:ring-1 focus:ring-[#082b1c] dark:border-gray-600 dark:bg-gray-900 dark:text-white dark:placeholder:text-gray-500 dark:focus:border-[#5ec998] dark:focus:ring-[#5ec998]"
                    autoComplete="off"
                  />
                </label>
              </div>
            ) : null}
            {children}
          </div>
        </div>
      </div>
    </div>
  );
}

export type PageListeCategoryCardProps = {
  /** Titre de la carte (ex. nom du semestre). */
  title: ReactNode;
  /** Ligne secondaire (crédits, ordre, méta). */
  meta?: ReactNode;
  /** Contenu métier : liste d’UE, table, etc. */
  children?: ReactNode;
  className?: string;
};

/** Carte catégorie : reçoit le contenu via `children` (réutilisable). */
export function PageListeCategoryCard({ title, meta, children, className = "" }: PageListeCategoryCardProps) {
  return (
    <section
      className={`rounded-xl border border-gray-200 bg-white shadow-sm dark:border-gray-800 dark:bg-gray-900 ${className}`.trim()}
    >
      <header className="border-b border-gray-100 px-4 py-3 dark:border-gray-800 sm:px-5">
        <h2 className="text-base font-semibold text-midnight_text dark:text-white">{title}</h2>
        {meta ? <div className="mt-1 text-xs text-gray-500 dark:text-gray-400">{meta}</div> : null}
      </header>
      <div className="px-4 py-4 sm:px-5 sm:py-5">{children}</div>
    </section>
  );
}
