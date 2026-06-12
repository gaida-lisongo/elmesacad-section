'use client';

import { Icon } from "@iconify/react";
import type { SessionResourceRow } from "@/actions/gestionnaireSessionResources";
import { ResourceWorkspaceMode } from "@/components/secure/etudiant-resources";


export default function RessourceExamen({ 
    r,
    statusToggleId,
    deletingId,
    togglePublicationStatus,
    openEdit,
    onDelete,
    setRow,
    setUiMode,
    isPublicationActive,
    onGenerateReport,
    onManageCollectors,
}: { 
    r: SessionResourceRow, 
    statusToggleId: string | null, 
    deletingId: string | null, 
    togglePublicationStatus: (r: SessionResourceRow) => void, 
    openEdit: (r: SessionResourceRow) => void, 
    onDelete: (r: SessionResourceRow) => void, 
    setRow: (r: SessionResourceRow) => void, 
    setUiMode: (mode: ResourceWorkspaceMode) => void,
    isPublicationActive: (status: string) => boolean,
    onGenerateReport: (r: SessionResourceRow) => void;
    onManageCollectors: (r: SessionResourceRow) => void;
}) {
    const active = isPublicationActive(r.status);
    const switching = statusToggleId === r.id;
    const removing = deletingId === r.id;
    return (
      <article
        className="group relative flex flex-col overflow-hidden rounded-2xl border border-gray-200/90 bg-white shadow-md transition-all duration-300 hover:-translate-y-1.5 hover:border-primary/40 hover:shadow-xl dark:border-gray-700 dark:bg-gray-900"
      >
        {removing ? (
          <div
            className="absolute inset-0 z-20 flex flex-col items-center justify-center gap-2 bg-white/80 px-4 text-center dark:bg-gray-900/85"
            role="status"
            aria-live="polite"
          >
            <Icon icon="svg-spinners:ring-resize" className="h-8 w-8 text-primary" aria-hidden />
            <p className="text-sm font-semibold text-midnight_text dark:text-white">Suppression en cours…</p>
          </div>
        ) : null}
        <div className="flex flex-1 flex-col p-5 pt-6">
          {/* Gestion des percepteur et Qr Code de pour effectué le paiement */}
          <div>
            <div>
                <h3 className="line-clamp-2 text-base font-bold leading-snug text-midnight_text dark:text-white">
                    {r.designation}
                </h3>
                <p className="mt-1.5 font-mono text-[11px] text-gray-400">
                    <Icon icon="solar:hashtag-bold-duotone" className="mr-0.5 inline h-3 w-3" />
                    {r.id.slice(-10)}
                </p>
            </div>
            <div className="flex gap-2 mb-4">
                <button
                    type="button"
                    onClick={() => onGenerateReport(r)}
                    className="flex-1 flex items-center justify-center gap-1.5 rounded-lg border border-indigo-200 bg-indigo-50 px-2 py-1.5 text-[10px] font-bold text-indigo-700 hover:bg-indigo-100"
                >
                    <Icon icon="solar:document-text-bold-duotone" className="h-3.5 w-3.5" />
                    Communiqué
                </button>
                <button
                    type="button"
                    onClick={() => onManageCollectors(r)}
                    className="flex-1 flex items-center justify-center gap-1.5 rounded-lg border border-emerald-200 bg-emerald-50 px-2 py-1.5 text-[10px] font-bold text-emerald-700 hover:bg-emerald-100"
                >
                    <Icon icon="solar:users-group-rounded-bold-duotone" className="h-3.5 w-3.5" />
                    Percepteurs
                </button>
            </div>
          </div>

          <div
            className={`mt-4 flex items-center justify-between gap-3 rounded-2xl border px-3 py-3 ${
              active
                ? "border-primary/35 bg-primary/[0.07] dark:border-primary/40 dark:bg-primary/10"
                : "border-gray-200/90 bg-gray-50/90 dark:border-gray-700 dark:bg-gray-800/60"
            }`}
          >
            <div className="min-w-0">
              <p className="text-xs font-bold text-midnight_text dark:text-white">Publication</p>
              <p className="mt-0.5 text-[11px] text-gray-600 dark:text-gray-400">
                {active ? "Visible sur le service étudiant" : "Inactive"}
              </p>
            </div>
            <button
              type="button"
              role="switch"
              aria-checked={active}
              disabled={switching || !!statusToggleId}
              onClick={() => togglePublicationStatus(r)}
              className={`relative h-8 w-[3.25rem] shrink-0 rounded-full border-2 transition-all ${
                active
                  ? "border-primary/50 bg-primary"
                  : "border-gray-300 bg-gray-200 dark:border-gray-600 dark:bg-gray-700"
              } disabled:opacity-50`}
            >
              <span
                className={`absolute top-0.5 left-0.5 flex h-6 w-6 items-center justify-center rounded-full bg-white shadow-md transition-transform ${
                  active ? "translate-x-[1.25rem]" : "translate-x-0"
                }`}
              >
                {switching ? <Icon icon="svg-spinners:ring-resize" className="size-3.5 text-primary" /> : null}
              </span>
            </button>
          </div>

          <div className="mt-4 flex flex-wrap gap-2">
            <span className="inline-flex items-center gap-1.5 rounded-lg bg-gray-100 px-2.5 py-1 text-xs font-semibold dark:bg-gray-800">
              {r.amount} {r.currency}
            </span>
            <span className="inline-flex items-center gap-1.5 rounded-lg bg-gray-100 px-2.5 py-1 text-xs font-medium dark:bg-gray-800 dark:text-gray-200">
              {r.matieresCount} programme{r.matieresCount > 1 ? "s" : ""}
            </span>
          </div>
          <p className="mt-2 line-clamp-3 text-xs text-gray-600 dark:text-gray-400">{r.matieresSummary}</p>

          <div className="mt-auto flex flex-wrap gap-2 border-t border-gray-100 pt-4 dark:border-gray-800">

            <button
              type="button"
              onClick={() => openEdit(r)}
              className="inline-flex flex-1 items-center justify-center gap-1.5 rounded-xl border border-transparent bg-primary/10 px-3 py-2 text-xs font-semibold text-primary dark:bg-primary/20"
            >
              <Icon icon="solar:pen-new-square-bold-duotone" className="h-4 w-4" />
              Modifier
            </button>
            <button 
              type="button"
              onClick={() => {
                setRow(r);
                setUiMode("payment");
              }}
              className="inline-flex flex-1 items-center justify-center gap-1.5 rounded-xl border border-transparent bg-primary/10 px-3 py-2 text-xs font-semibold text-primary dark:bg-primary/20"
            >
              {/* Icone banque */}
              <Icon icon="solar:wallet-money-bold-duotone" className="h-4 w-4 text-primary" />
              Paiement
            </button>
            <button
              type="button"
              onClick={() => onDelete(r)}
              disabled={deletingId !== null}
              className="inline-flex items-center justify-center rounded-xl border border-rose-200/80 bg-rose-50/80 px-3 py-2 text-xs font-semibold text-rose-700 disabled:opacity-50 dark:border-rose-900/50 dark:bg-rose-950/40 dark:text-rose-200"
              aria-label="Supprimer"
            >
              <Icon icon="solar:trash-bin-trash-bold-duotone" className="h-4 w-4" />
            </button>
          </div>
        </div>
      </article>
    );
  }
