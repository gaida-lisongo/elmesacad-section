"use client";

import Link from "next/link";
import { useCallback, useState, useTransition } from "react";
import { Icon } from "@iconify/react";
import type { ValidationResourceRow } from "@/actions/gestionnaireValidationResources";
import {
  deleteGestionnaireValidationResourceAction,
  listGestionnaireValidationResourcesAction,
  patchGestionnaireValidationResourceStatusAction,
} from "@/actions/gestionnaireValidationResources";
import ResourceWorkspaceShell from "@/components/secure/etudiant-resources/ResourceWorkspaceShell";
import type { ResourceWorkspaceMode } from "@/components/secure/etudiant-resources/types";
import GestionnaireValidationResourceForm, { type ChefSectionDefaults } from "./GestionnaireValidationResourceForm";

type ProgrammeOption = { slug: string; designation: string; credits: number };
type AnneeOption = { slug: string; designation: string; debut: number; fin: number };

type Props = {
  sectionSlug: string;
  sectionDesignation: string;
  sectionCycle: string;
  programmes: ProgrammeOption[];
  annees: AnneeOption[];
  chefSection: ChefSectionDefaults;
  initialData: { rows: ValidationResourceRow[]; total: number; page: number; limit: number };
  initialError?: string;
};

function isPublicationActive(status: string): boolean {
  const st = (status || "").toLowerCase();
  return st === "active" || st === "published" || st === "disponible";
}

export default function GestionnaireValidationResourcesClient({
  sectionSlug,
  sectionDesignation,
  sectionCycle,
  programmes,
  annees,
  chefSection,
  initialData,
  initialError,
}: Props) {
  const [rows, setRows] = useState<ValidationResourceRow[]>(initialData.rows);
  const [total, setTotal] = useState(initialData.total);
  const [page, setPage] = useState(initialData.page);
  const [limit] = useState(initialData.limit);
  const [searchInput, setSearchInput] = useState("");
  const [searchApplied, setSearchApplied] = useState("");
  const [bannerError, setBannerError] = useState<string | undefined>(initialError);
  const [uiMode, setUiMode] = useState<ResourceWorkspaceMode>("list");
  const [editingId, setEditingId] = useState<string | null>(null);
  const [statusToggleId, setStatusToggleId] = useState<string | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  const loadList = useCallback(
    (nextPage: number, search: string) => {
      setBannerError(undefined);
      startTransition(async () => {
        try {
          const res = await listGestionnaireValidationResourcesAction({
            sectionSlug,
            page: nextPage,
            limit,
            search,
          });
          setRows(res.rows);
          setTotal(res.total);
          setPage(res.page);
        } catch (e) {
          setBannerError((e as Error).message);
        }
      });
    },
    [sectionSlug, limit]
  );

  const openCreate = useCallback(() => {
    setEditingId(null);
    setUiMode("create");
  }, []);

  const openEdit = (row: ValidationResourceRow) => {
    setEditingId(row.id);
    setUiMode("edit");
  };

  const onDelete = (row: ValidationResourceRow) => {
    if (!window.confirm(`Supprimer la ressource « ${row.designation} » ?`)) return;
    setBannerError(undefined);
    setDeletingId(row.id);
    startTransition(async () => {
      try {
        await deleteGestionnaireValidationResourceAction({ sectionSlug, id: row.id });
        loadList(page, searchApplied);
      } catch (e) {
        setBannerError((e as Error).message);
      } finally {
        setDeletingId(null);
      }
    });
  };

  const togglePublicationStatus = (row: ValidationResourceRow) => {
    const nextActive = !isPublicationActive(row.status);
    setBannerError(undefined);
    setStatusToggleId(row.id);
    void (async () => {
      try {
        const updated = await patchGestionnaireValidationResourceStatusAction({
          sectionSlug,
          id: row.id,
          status: nextActive ? "active" : "inactive",
        });
        setRows((prev) => prev.map((x) => (x.id === row.id ? updated : x)));
      } catch (e) {
        setBannerError((e as Error).message);
      } finally {
        setStatusToggleId(null);
      }
    })();
  };

  const tablePageIndex = Math.max(0, page - 1);
  const pageCount = Math.max(1, Math.ceil(total / limit) || 1);
  const canCreate = programmes.length > 0 && annees.length > 0;

  const listDescription = (
    <p className="flex flex-wrap items-center gap-2">
      <Icon icon="solar:buildings-3-bold-duotone" className="h-4 w-4 shrink-0 text-gray-400" />
      Section : <strong>{sectionDesignation}</strong>
      <span className="hidden sm:inline">—</span>
      <code className="rounded bg-gray-100 px-1 text-xs dark:bg-gray-800">sectionRef = {sectionSlug}</code>
    </p>
  );

  const listSlot = (
    <>
      {!canCreate ? (
        <div className="flex gap-3 rounded-xl border border-amber-300/80 bg-amber-50/90 px-4 py-3 text-sm text-amber-950 dark:border-amber-800 dark:bg-amber-950/40 dark:text-amber-100">
          <Icon icon="solar:danger-triangle-bold-duotone" className="mt-0.5 h-5 w-5 shrink-0" />
          <p>
            Ajoutez au moins <strong>un programme</strong> et <strong>une année académique</strong> en base locale pour
            créer une fiche de validation.
          </p>
        </div>
      ) : null}

      {bannerError ? (
        <div className="flex gap-3 rounded-xl border border-amber-300/80 bg-amber-50/90 px-4 py-3 text-sm text-amber-950 dark:border-amber-800 dark:bg-amber-950/40 dark:text-amber-100">
          <Icon icon="solar:info-circle-bold-duotone" className="mt-0.5 h-5 w-5 shrink-0" />
          <p>{bannerError}</p>
        </div>
      ) : null}

      <div className="flex flex-col gap-4 sm:flex-row sm:flex-wrap sm:items-center sm:justify-between">
        <div>
          <h2 className="text-lg font-bold tracking-tight text-midnight_text dark:text-white">
            Fiches de validation (service étudiant)
          </h2>
          <p className="mt-0.5 max-w-xl text-sm text-gray-600 dark:text-gray-400">
            Ressources <strong>validation</strong> rattachées à votre section. Création en <strong>inactive</strong> ;
            activez la publication lorsque la fiche doit être proposée aux étudiants.
          </p>
        </div>
        <div className="flex w-full flex-col gap-2 sm:w-auto sm:flex-row sm:items-center">
          <input
            type="search"
            value={searchInput}
            onChange={(e) => setSearchInput(e.target.value)}
            placeholder="Filtrer par désignation…"
            disabled={pending}
            className="w-full min-w-[14rem] rounded-xl border border-gray-200 bg-white px-4 py-2.5 text-sm shadow-sm outline-none dark:border-gray-600 dark:bg-gray-800 dark:text-white sm:w-64"
          />
          <div className="flex gap-2">
            <button
              type="button"
              onClick={() => {
                setSearchApplied(searchInput.trim());
                loadList(1, searchInput.trim());
              }}
              disabled={pending}
              className="inline-flex flex-1 items-center justify-center gap-1.5 rounded-xl border border-gray-200 bg-white px-4 py-2.5 text-sm font-semibold shadow-sm sm:flex-initial dark:border-gray-600 dark:bg-gray-900"
            >
              <Icon icon="solar:magnifer-bold-duotone" className="h-4 w-4 text-primary" />
              Rechercher
            </button>
            {canCreate ? (
              <button
                type="button"
                onClick={openCreate}
                disabled={pending}
                className="inline-flex flex-1 items-center justify-center gap-1.5 rounded-xl bg-primary px-4 py-2.5 text-sm font-semibold text-white shadow-md sm:flex-initial"
              >
                <Icon icon="solar:add-circle-bold-duotone" className="h-5 w-5" />
                Nouvelle fiche
              </button>
            ) : null}
          </div>
        </div>
      </div>

      {pending && rows.length === 0 ? (
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
          {Array.from({ length: 6 }).map((_, i) => (
            <div
              key={i}
              className="h-52 animate-pulse rounded-2xl bg-gradient-to-br from-gray-100 to-gray-50 dark:from-gray-800 dark:to-gray-900"
            />
          ))}
        </div>
      ) : rows.length === 0 ? (
        <div className="flex flex-col items-center justify-center rounded-2xl border border-dashed border-gray-300 bg-gray-50/50 px-8 py-16 text-center dark:border-gray-600 dark:bg-gray-900/40">
          <Icon icon="solar:document-text-bold-duotone" className="mb-3 h-14 w-14 text-gray-400" />
          <p className="font-semibold text-midnight_text dark:text-white">Aucune fiche de validation</p>
          <p className="mt-1 max-w-sm text-sm text-gray-500 dark:text-gray-400">
            Créez une ressource lorsque les programmes et années sont disponibles.
          </p>
        </div>
      ) : (
        <div
          className={`grid gap-4 sm:grid-cols-2 xl:grid-cols-3 ${pending || deletingId ? "pointer-events-none opacity-70" : ""}`}
          aria-busy={pending || !!deletingId}
        >
          {rows.map((r) => {
            const active = isPublicationActive(r.status);
            const switching = statusToggleId === r.id;
            const removing = deletingId === r.id;
            return (
              <article
                key={r.id}
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
                  <h3 className="line-clamp-2 text-base font-bold leading-snug text-midnight_text dark:text-white">
                    {r.designation}
                  </h3>
                  <p className="mt-1.5 font-mono text-[11px] text-gray-400">
                    <Icon icon="solar:hashtag-bold-duotone" className="mr-0.5 inline h-3 w-3" />
                    {r.id.slice(-10)}
                  </p>

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
                      disabled={switching || !!statusToggleId || !!deletingId}
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
                      {r.anneeSlug || "—"}
                    </span>
                  </div>
                  <p className="mt-2 text-xs text-gray-600 dark:text-gray-400">
                    {r.programmeClasse} · {r.programmeFiliere} · {r.programmeCredits} cr.
                  </p>

                  <div className="mt-auto flex flex-wrap gap-2 border-t border-gray-100 pt-4 dark:border-gray-800">
                    <Link
                      href={`/section/fiches-validation/validations/${r.id}`}
                      className="inline-flex flex-1 items-center justify-center gap-1.5 rounded-xl border border-gray-200 bg-gray-50/80 px-3 py-2 text-xs font-semibold text-midnight_text transition hover:border-primary/40 hover:bg-primary/5 dark:border-gray-600 dark:bg-gray-800/80 dark:hover:bg-gray-800"
                    >
                      <Icon icon="solar:cart-check-bold-duotone" className="h-4 w-4 text-primary" />
                      Demandes
                    </Link>
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
                      onClick={() => onDelete(r)}
                      className="inline-flex items-center justify-center rounded-xl border border-rose-200/80 bg-rose-50/80 px-3 py-2 text-xs font-semibold text-rose-700 dark:border-rose-900/50 dark:bg-rose-950/40 dark:text-rose-200"
                      aria-label="Supprimer"
                    >
                      <Icon icon="solar:trash-bin-trash-bold-duotone" className="h-4 w-4" />
                    </button>
                  </div>
                </div>
              </article>
            );
          })}
        </div>
      )}

      {total > 0 ? (
        <div className="flex flex-wrap items-center justify-between gap-3 pt-2 text-sm text-gray-600 dark:text-gray-400">
          <span>
            {total} résultat{total > 1 ? "s" : ""} — page {tablePageIndex + 1} / {pageCount}
          </span>
          <div className="flex gap-2">
            <button
              type="button"
              disabled={tablePageIndex <= 0 || pending || !!deletingId}
              onClick={() => loadList(page - 1, searchApplied)}
              className="rounded-xl border border-gray-200 bg-white px-4 py-2 text-sm disabled:opacity-40 dark:border-gray-600 dark:bg-gray-900"
            >
              Précédent
            </button>
            <button
              type="button"
              disabled={pending || tablePageIndex + 1 >= pageCount || total === 0 || !!deletingId}
              onClick={() => loadList(page + 1, searchApplied)}
              className="rounded-xl border border-gray-200 bg-white px-4 py-2 text-sm disabled:opacity-40 dark:border-gray-600 dark:bg-gray-900"
            >
              Suivant
            </button>
          </div>
        </div>
      ) : null}
    </>
  );

  const formSlot = (
    <GestionnaireValidationResourceForm
      mode={uiMode === "create" ? "create" : "edit"}
      editingId={editingId}
      sectionSlug={sectionSlug}
      sectionDesignation={sectionDesignation}
      sectionCycle={sectionCycle}
      programmes={programmes}
      annees={annees}
      chefSection={chefSection}
      onCancel={() => {
        setUiMode("list");
        setEditingId(null);
      }}
      onSaved={() => {
        setUiMode("list");
        setEditingId(null);
        loadList(page, searchApplied);
      }}
    />
  );

  return (
    <ResourceWorkspaceShell
      title="Fiches de validation"
      titleIcon="solar:document-text-bold-duotone"
      description={listDescription}
      mode={uiMode}
      listSlot={listSlot}
      formSlot={formSlot}
    />
  );
}
