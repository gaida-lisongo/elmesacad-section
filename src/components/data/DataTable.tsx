"use client";

import { Icon } from "@iconify/react";
import { useCallback, useEffect, useId, useMemo, useState } from "react";

export type DataTableColumn<T extends { id: string }> = {
  id: string;
  header: string;
  cell: (row: T) => React.ReactNode;
  className?: string;
  headerClassName?: string;
};

export type DataTableTab = { label: string; value: string };

export type DataTablePagination = {
  page: number;
  pageSize: number;
  total: number;
  onPageChange: (page: number) => void;
};

export type DataTableModalProps = {
  open: boolean;
  title: string;
  onClose: () => void;
  children: React.ReactNode;
  footer?: React.ReactNode;
  /** Classes du panneau (largeur / hauteur), ex. `max-w-7xl w-full …` */
  panelClassName?: string;
  /** Classes de la zone de contenu scrollable */
  bodyClassName?: string;
};

type DataTableProps<T extends { id: string }> = {
  /** En-tête zone repliée (barre de titre cliquable) */
  collapsible?: { title: string; subtitle?: string; defaultOpen?: boolean };
  tabs?: { items: DataTableTab[]; active: string; onChange: (value: string) => void };
  toolbarTitle?: string;
  toolbarDescription?: string;
  columns: DataTableColumn<T>[];
  rows: T[];
  isLoading?: boolean;
  emptyMessage?: string;
  searchPlaceholder?: string;
  searchValue: string;
  onSearchChange: (value: string) => void;
  filterSlot?: React.ReactNode;
  primaryAction?: { label: string; onClick: () => void; icon?: string };
  secondaryActions?: React.ReactNode;
  pagination?: DataTablePagination;
  selectable?: boolean;
  selectedIds?: string[];
  onSelectedIdsChange?: (ids: string[]) => void;
  rowActions?: (row: T) => React.ReactNode;
  modal?: DataTableModalProps;
};

function DataTableSkeleton({ colCount, rows = 6 }: { colCount: number; rows?: number }) {
  return (
    <tbody aria-hidden>
      {Array.from({ length: rows }).map((_, i) => (
        <tr key={i} className="border-b border-gray-100 dark:border-gray-800">
          {Array.from({ length: colCount }).map((__, j) => (
            <td key={j} className="px-3 py-3">
              <div className="h-3 w-full max-w-[12rem] animate-pulse rounded bg-gray-200 dark:bg-gray-700" />
            </td>
          ))}
        </tr>
      ))}
    </tbody>
  );
}

function DataTableModal({
  open,
  title,
  onClose,
  children,
  footer,
  panelClassName,
  bodyClassName,
}: DataTableModalProps) {
  const titleId = useId();
  useEffect(() => {
    if (!open) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = prev;
    };
  }, [open]);

  if (!open) return null;

  const panel =
    panelClassName?.trim() ||
    "max-h-[90vh] w-full max-w-lg overflow-y-auto rounded-xl border border-gray-200 bg-white shadow-xl dark:border-gray-700 dark:bg-gray-900";
  const body = bodyClassName?.trim() || "px-4 py-4 sm:px-5 sm:py-5";

  return (
    <div
      className="fixed inset-0 z-[200] flex items-center justify-center bg-black/50 p-3 sm:p-4"
      role="dialog"
      aria-modal="true"
      aria-labelledby={titleId}
    >
      <div className={panel}>
        <div className="flex items-start justify-between gap-3 border-b border-gray-200 px-4 py-3 sm:px-6 dark:border-gray-700">
          <h2 id={titleId} className="pr-2 text-lg font-semibold text-midnight_text dark:text-white">
            {title}
          </h2>
          <button
            type="button"
            onClick={onClose}
            className="shrink-0 rounded-lg p-1 text-gray-500 transition hover:bg-gray-100 dark:hover:bg-gray-800"
            aria-label="Fermer"
          >
            <Icon icon="solar:close-circle-linear" className="size-6" />
          </button>
        </div>
        <div className={body}>{children}</div>
        {footer && (
          <div className="flex flex-wrap justify-end gap-2 border-t border-gray-200 px-4 py-3 sm:px-6 dark:border-gray-700">
            {footer}
          </div>
        )}
      </div>
    </div>
  );
}

export function DataTable<T extends { id: string }>(props: DataTableProps<T>) {
  const {
    collapsible,
    tabs,
    toolbarTitle,
    toolbarDescription,
    columns,
    rows,
    isLoading,
    emptyMessage = "Aucun élément.",
    searchPlaceholder = "Rechercher…",
    searchValue,
    onSearchChange,
    filterSlot,
    primaryAction,
    secondaryActions,
    pagination,
    selectable,
    selectedIds = [],
    onSelectedIdsChange,
    rowActions,
    modal,
  } = props;

  const [expanded, setExpanded] = useState(collapsible?.defaultOpen ?? true);
  const pageIds = useMemo(() => new Set(rows.map((r) => r.id)), [rows]);
  const allPageSelected = rows.length > 0 && rows.every((r) => selectedIds.includes(r.id));

  const toggleAllPage = useCallback(() => {
    if (!onSelectedIdsChange) return;
    if (allPageSelected) {
      onSelectedIdsChange(selectedIds.filter((id) => !pageIds.has(id)));
    } else {
      const next = new Set(selectedIds);
      rows.forEach((r) => next.add(r.id));
      onSelectedIdsChange([...next]);
    }
  }, [allPageSelected, onSelectedIdsChange, pageIds, rows, selectedIds]);

  const toggleOne = useCallback(
    (id: string) => {
      if (!onSelectedIdsChange) return;
      if (selectedIds.includes(id)) {
        onSelectedIdsChange(selectedIds.filter((x) => x !== id));
      } else {
        onSelectedIdsChange([...selectedIds, id]);
      }
    },
    [onSelectedIdsChange, selectedIds]
  );

  const colCount = columns.length + (selectable ? 1 : 0) + (rowActions ? 1 : 0);

  const inner = (
    <>
      {(toolbarTitle || toolbarDescription) && (
        <div className="mb-4">
          {toolbarTitle && (
            <h3 className="text-sm font-semibold text-midnight_text dark:text-white">{toolbarTitle}</h3>
          )}
          {toolbarDescription && (
            <p className="mt-1 text-xs text-body-color dark:text-gray-400">{toolbarDescription}</p>
          )}
        </div>
      )}

      {tabs && tabs.items.length > 0 && (
        <div className="mb-4 flex flex-wrap gap-2">
          {tabs.items.map((tab) => {
            const active = tab.value === tabs.active;
            return (
              <button
                key={tab.value}
                type="button"
                onClick={() => tabs.onChange(tab.value)}
                className={`rounded-full px-3 py-1 text-xs font-semibold transition ${
                  active
                    ? "bg-[#082b1c] text-white"
                    : "bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-300"
                }`}
              >
                {tab.label}
              </button>
            );
          })}
        </div>
      )}

      <div className="mb-4 flex flex-wrap items-center gap-2">
        <input
          type="search"
          value={searchValue}
          onChange={(e) => onSearchChange(e.target.value)}
          placeholder={searchPlaceholder}
          className="min-w-[12rem] flex-1 rounded-md border border-gray-300 px-3 py-2 text-sm outline-none focus:border-[#082b1c] dark:border-gray-700 dark:bg-gray-800 dark:text-white"
        />
        {filterSlot}
        {secondaryActions}
        {primaryAction && (
          <button
            type="button"
            onClick={primaryAction.onClick}
            className="inline-flex items-center gap-1.5 rounded-md bg-[#082b1c] px-4 py-2 text-sm font-semibold text-white transition hover:brightness-110"
          >
            {primaryAction.icon && <Icon icon={primaryAction.icon} className="size-4" />}
            {primaryAction.label}
          </button>
        )}
      </div>

      <div className="overflow-x-auto rounded-lg border border-gray-200 dark:border-gray-700">
        <table className="min-w-full text-left text-sm">
          <thead>
            <tr className="border-b border-gray-200 bg-gray-50/80 dark:border-gray-700 dark:bg-gray-800/50">
              {selectable && (
                <th className="w-10 px-3 py-2">
                  <input
                    type="checkbox"
                    checked={allPageSelected}
                    onChange={toggleAllPage}
                    disabled={isLoading || rows.length === 0}
                    className="rounded border-gray-300"
                    aria-label="Tout sélectionner sur cette page"
                  />
                </th>
              )}
              {columns.map((c) => (
                <th
                  key={c.id}
                  className={`px-3 py-2 text-xs font-semibold uppercase tracking-wide text-gray-500 dark:text-gray-400 ${c.headerClassName ?? ""}`}
                >
                  {c.header}
                </th>
              ))}
              {rowActions && (
                <th className="px-3 py-2 text-xs font-semibold uppercase tracking-wide text-gray-500 dark:text-gray-400">
                  Actions
                </th>
              )}
            </tr>
          </thead>
          {isLoading ? (
            <DataTableSkeleton colCount={colCount} />
          ) : (
            <tbody>
              {rows.length === 0 ? (
                <tr>
                  <td
                    colSpan={colCount}
                    className="px-3 py-8 text-center text-sm text-gray-500 dark:text-gray-400"
                  >
                    {emptyMessage}
                  </td>
                </tr>
              ) : (
                rows.map((row) => (
                  <tr
                    key={row.id}
                    className="border-b border-gray-100 transition-colors hover:bg-gray-50/80 dark:border-gray-800 dark:hover:bg-gray-800/40"
                  >
                    {selectable && (
                      <td className="px-3 py-2">
                        <input
                          type="checkbox"
                          checked={selectedIds.includes(row.id)}
                          onChange={() => toggleOne(row.id)}
                          className="rounded border-gray-300"
                          aria-label={`Sélectionner ${row.id}`}
                        />
                      </td>
                    )}
                    {columns.map((c) => (
                      <td key={c.id} className={`px-3 py-2 text-gray-800 dark:text-gray-200 ${c.className ?? ""}`}>
                        {c.cell(row)}
                      </td>
                    ))}
                    {rowActions && <td className="px-3 py-2">{rowActions(row)}</td>}
                  </tr>
                ))
              )}
            </tbody>
          )}
        </table>
      </div>

      {pagination && (
        <div className="mt-4 flex flex-wrap items-center justify-between gap-2 text-xs text-gray-600 dark:text-gray-400">
          <span>
            {pagination.total} résultat{pagination.total > 1 ? "s" : ""} — page {pagination.page + 1} /{" "}
            {Math.max(1, Math.ceil(pagination.total / pagination.pageSize) || 1)}
          </span>
          <div className="flex gap-2">
            <button
              type="button"
              disabled={pagination.page <= 0 || isLoading}
              onClick={() => pagination.onPageChange(Math.max(0, pagination.page - 1))}
              className="rounded-md border border-gray-300 px-3 py-1.5 font-medium transition hover:bg-gray-50 disabled:opacity-50 dark:border-gray-600 dark:hover:bg-gray-800"
            >
              Précédent
            </button>
            <button
              type="button"
              disabled={
                isLoading ||
                (pagination.page + 1) * pagination.pageSize >= pagination.total ||
                pagination.total === 0
              }
              onClick={() => pagination.onPageChange(pagination.page + 1)}
              className="rounded-md border border-gray-300 px-3 py-1.5 font-medium transition hover:bg-gray-50 disabled:opacity-50 dark:border-gray-600 dark:hover:bg-gray-800"
            >
              Suivant
            </button>
          </div>
        </div>
      )}
    </>
  );

  const modalNode = modal ? (
    <DataTableModal
      open={modal.open}
      title={modal.title}
      onClose={modal.onClose}
      footer={modal.footer}
      panelClassName={modal.panelClassName}
      bodyClassName={modal.bodyClassName}
    >
      {modal.children}
    </DataTableModal>
  ) : null;

  if (collapsible) {
    return (
      <>
      <section className="w-full min-w-0 rounded-xl border border-gray-200 bg-white shadow-sm dark:border-gray-800 dark:bg-gray-900">
        <button
          type="button"
          onClick={() => setExpanded((e) => !e)}
          aria-expanded={expanded}
          className="flex w-full items-center justify-between gap-3 px-4 py-3 text-left transition hover:bg-gray-50 dark:hover:bg-gray-800/60"
        >
          <div>
            <span className="text-sm font-semibold text-midnight_text dark:text-white">
              {collapsible.title}
            </span>
            {collapsible.subtitle && (
              <p className="mt-0.5 text-xs text-gray-500 dark:text-gray-400">{collapsible.subtitle}</p>
            )}
          </div>
          <Icon
            icon={expanded ? "solar:alt-arrow-up-linear" : "solar:alt-arrow-down-linear"}
            className="size-5 shrink-0 text-gray-500"
            aria-hidden
          />
        </button>
        <div
          className={`grid transition-[grid-template-rows] duration-300 ease-in-out ${
            expanded ? "grid-rows-[1fr]" : "grid-rows-[0fr]"
          }`}
        >
          <div className="min-h-0 w-full min-w-0 overflow-hidden border-t border-gray-100 dark:border-gray-800">
            <div className="w-full min-w-0 p-4 pt-3">{inner}</div>
          </div>
        </div>
      </section>
      {modalNode}
      </>
    );
  }

  return (
    <>
    <section className="w-full min-w-0 rounded-xl border border-gray-200 bg-white p-4 shadow-sm dark:border-gray-800 dark:bg-gray-900">
      {inner}
    </section>
    {modalNode}
    </>
  );
}
