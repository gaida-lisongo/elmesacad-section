'use client';

import React, { useMemo, useState } from "react";
import CsvImport from "./CsvImport";

export type PageTab = {
  label: string;
  value: string;
};

type PageManagerProps<T extends { id: string }> = {
  title: string;
  description: string;
  items: T[];
  tabs: PageTab[];
  activeTab: string;
  CardItem: React.ComponentType<{ item: T }>;
  CardCreate?: React.ComponentType;
  onCreate?: (formData: FormData) => Promise<void> | void;
  onDelete?: (id: string) => Promise<void> | void;
  onBulkCreate?: (rawText: string, onProgress?: (progress: number) => void) => Promise<void> | void;
  bulkCsvHeaders?: string[];
  onTabChange?: (tab: string) => void;
  searchPlaceholder?: string;
  searchText?: string;
  onSearchChange?: (value: string) => void;
  /** When true, list items are not wrapped in a bordered box (for cards that provide their own chrome). */
  bareListItems?: boolean;
  showCreateButton?: boolean;
};

function PageHeader({ title, description }: { title: string; description: string }) {
  return (
    <header className="mb-6">
      <h1 className="text-2xl font-bold text-midnight_text dark:text-white">{title}</h1>
      <p className="mt-1 text-sm text-body-color">{description}</p>
    </header>
  );
}

function PageTabulation({
  tabs,
  activeTab,
  onTabChange,
}: {
  tabs: PageTab[];
  activeTab: string;
  onTabChange?: (tab: string) => void;
}) {
  return (
    <div className="mb-6 flex flex-wrap gap-2">
      {tabs.map((tab) => {
        const isActive = tab.value === activeTab;
        return (
          <button
            type="button"
            onClick={() => onTabChange?.(tab.value)}
            key={tab.value}
            className={`rounded-full px-3 py-1 text-xs font-semibold ${
              isActive
                ? "bg-[#082b1c] text-white"
                : "bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-300"
            }`}
          >
            {tab.label}
          </button>
        );
      })}
    </div>
  );
}

export default function PageManager<T extends { id: string }>({
  title,
  description,
  items,
  tabs,
  activeTab,
  CardItem,
  CardCreate,
  onCreate,
  onDelete,
  onBulkCreate,
  bulkCsvHeaders = [],
  onTabChange,
  searchPlaceholder = "Rechercher...",
  searchText,
  onSearchChange,
  bareListItems = false,
  showCreateButton = true,
}: PageManagerProps<T>) {
  const [showCreate, setShowCreate] = useState(false);
  const [showBulkCreate, setShowBulkCreate] = useState(false);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [internalSearch, setInternalSearch] = useState("");
  const [bulkText, setBulkText] = useState("");
  const currentSearch = searchText ?? internalSearch;

  const displayedItems = useMemo(() => {
    if (onSearchChange) {
      return items;
    }

    if (!currentSearch.trim()) {
      return items;
    }

    const query = currentSearch.toLowerCase();
    return items.filter((item) => JSON.stringify(item).toLowerCase().includes(query));
  }, [items, currentSearch, onSearchChange]);

  const handleSearchChange = (value: string) => {
    if (onSearchChange) {
      onSearchChange(value);
      return;
    }

    setInternalSearch(value);
  };

  const downloadCsvTemplate = () => {
    if (!bulkCsvHeaders.length) {
      return;
    }

    const headerLine = bulkCsvHeaders.join(",");
    const csvContent = `${headerLine}\n`;
    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = "modele-bulk.csv";
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  return (
    <section className="rounded-xl border border-gray-200 bg-white p-5 shadow-sm dark:border-gray-800 dark:bg-gray-900">
      <PageHeader title={title} description={description} />
      <PageTabulation tabs={tabs} activeTab={activeTab} onTabChange={onTabChange} />

      <div className="mb-4 flex flex-wrap items-center gap-2">
        <input
          type="search"
          value={currentSearch}
          onChange={(event) => handleSearchChange(event.target.value)}
          placeholder={searchPlaceholder}
          className="min-w-72 flex-1 rounded-md border border-gray-300 px-3 py-2 text-sm outline-none focus:border-[#082b1c] dark:border-gray-700 dark:bg-gray-800 dark:text-white"
        />
        {showCreateButton ? (
          <button
            type="button"
            onClick={() => setShowCreate((prev) => !prev)}
            className="rounded-md bg-[#082b1c] px-4 py-2 text-sm font-semibold text-white"
          >
            {showCreate ? "Retour a la table" : "Creer"}
          </button>
        ) : null}
        {onBulkCreate && (
          <button
            type="button"
            onClick={() => setShowBulkCreate((prev) => !prev)}
            className="rounded-md border border-[#082b1c] px-4 py-2 text-sm font-semibold text-[#082b1c]"
          >
            {showBulkCreate ? "Fermer bulk" : "Creation bulk"}
          </button>
        )}
      </div>

      {showBulkCreate && onBulkCreate && (
        <div className="mb-4 rounded-lg border border-dashed border-gray-300 p-4 dark:border-gray-700">
          <p className="mb-2 text-xs text-gray-500">
            1 ligne = 1 enregistrement. Format CSV par ligne selon la page.
          </p>
          {bulkCsvHeaders.length > 0 && (
            <button
              type="button"
              onClick={downloadCsvTemplate}
              className="mb-2 rounded-md border border-[#082b1c] px-3 py-1 text-xs font-semibold text-[#082b1c]"
            >
              Telecharger le modele CSV
            </button>
          )}
          <div className="mt-2">
            <button
              type="button"
              onClick={async () => {
                await onBulkCreate(bulkText);
                setBulkText("");
              }}
              className="rounded-md bg-[#082b1c] px-4 py-2 text-sm font-semibold text-white"
            >
              Executer bulk create
            </button>
          </div>

          <div className="mt-4">
            <CsvImport
              templateHeaders={bulkCsvHeaders}
              onPersist={async (rawText, onProgress) => {
                await onBulkCreate(rawText, onProgress);
              }}
            />
          </div>
        </div>
      )}

      {showCreate && CardCreate ? (
        <div className="rounded-lg border border-dashed border-gray-300 p-4 dark:border-gray-700">
          {onCreate ? (
            <form
              onSubmit={async (event) => {
                event.preventDefault();
                const formData = new FormData(event.currentTarget);
                await onCreate(formData);
              }}
            >
              <CardCreate />
            </form>
          ) : (
            <CardCreate />
          )}
        </div>
      ) : (
        <div className="space-y-3">
          {displayedItems.map((item) => {
            const isSelected = selectedId === item.id;

            return (
              <article
                key={item.id}
                className={`w-full transition ${
                  bareListItems
                    ? isSelected
                      ? "ring-2 ring-[#082b1c] ring-offset-2 ring-offset-white dark:ring-offset-gray-900"
                      : ""
                    : `rounded-2xl border p-4 ${
                        isSelected
                          ? "border-[#082b1c] bg-[#082b1c]/5 dark:border-[#5ec998]"
                          : "border-gray-200 dark:border-gray-700"
                      }`
                }`}
              >
                <div
                  role="button"
                  tabIndex={0}
                  onClick={() => setSelectedId(item.id)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter" || e.key === " ") {
                      e.preventDefault();
                      setSelectedId(item.id);
                    }
                  }}
                  className="w-full cursor-pointer text-left outline-none focus-visible:ring-2 focus-visible:ring-[#082b1c]/40"
                >
                  <CardItem item={item} />
                </div>
                {onDelete && (
                  <button
                    type="button"
                    onClick={() => onDelete(item.id)}
                    className={`rounded-md bg-rose-50 px-3 py-1 text-xs font-medium text-rose-600 hover:bg-rose-100 dark:bg-rose-900/30 dark:text-rose-300 ${
                      bareListItems ? "mt-2" : "mt-3"
                    }`}
                  >
                    Supprimer
                  </button>
                )}
              </article>
            );
          })}
        </div>
      )}
    </section>
  );
}
