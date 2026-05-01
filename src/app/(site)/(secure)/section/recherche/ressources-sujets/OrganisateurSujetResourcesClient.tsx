"use client";

import Link from "next/link";
import { useCallback, useMemo, useState, useTransition } from "react";
import { Icon } from "@iconify/react";
import type { SujetResourceRow } from "@/actions/organisateurSujetResources";
import {
  deleteOrganisateurSujetResourceAction,
  listOrganisateurSujetResourcesAction,
} from "@/actions/organisateurSujetResources";
import ResourceWorkspaceShell from "@/components/secure/etudiant-resources/ResourceWorkspaceShell";
import type { ResourceWorkspaceMode } from "@/components/secure/etudiant-resources/types";
import OrganisateurSujetResourceForm, { type ChefSectionDefaults } from "./OrganisateurSujetResourceForm";

type ProgrammeOption = { slug: string; designation: string; credits: number };

type JuryRechercheMemberOption = {
  id: string;
  nom: string;
  email: string;
  matricule: string;
  role: "president" | "secretaire" | "membre";
};

type Props = {
  sectionSlug: string;
  sectionDesignation: string;
  programmes: ProgrammeOption[];
  juryRechercheMembers: JuryRechercheMemberOption[];
  chefSection: ChefSectionDefaults;
  initialData: { rows: SujetResourceRow[]; total: number; page: number; limit: number };
  initialError?: string;
};

function creditsLabel(row: SujetResourceRow, programmes: ProgrammeOption[]): string {
  if (row.matiereCredit > 0) return `${row.matiereCredit} crédit${row.matiereCredit !== 1 ? "s" : ""}`;
  const p = programmes.find((x) => x.slug === row.matiereReference);
  if (p && p.credits > 0) return `${p.credits} crédit${p.credits !== 1 ? "s" : ""} (prog.)`;
  return "—";
}

export default function OrganisateurSujetResourcesClient({
  sectionSlug,
  sectionDesignation,
  programmes,
  juryRechercheMembers,
  chefSection,
  initialData,
  initialError,
}: Props) {
  const [rows, setRows] = useState<SujetResourceRow[]>(initialData.rows);
  const [total, setTotal] = useState(initialData.total);
  const [page, setPage] = useState(initialData.page);
  const [limit] = useState(initialData.limit);
  const [searchInput, setSearchInput] = useState("");
  const [searchApplied, setSearchApplied] = useState("");
  const [bannerError, setBannerError] = useState<string | undefined>(initialError);
  const [uiMode, setUiMode] = useState<ResourceWorkspaceMode>("list");
  const [editingId, setEditingId] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  const sectionRefDisplay = sectionSlug;

  const programmeLabel = useCallback(
    (slug: string) => programmes.find((p) => p.slug === slug)?.designation ?? slug,
    [programmes]
  );

  const loadList = useCallback(
    (nextPage: number, search: string) => {
      setBannerError(undefined);
      startTransition(async () => {
        try {
          const res = await listOrganisateurSujetResourcesAction({
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

  const openEdit = (row: SujetResourceRow) => {
    setEditingId(row.id);
    setUiMode("edit");
  };

  const onDelete = (row: SujetResourceRow) => {
    if (!window.confirm(`Supprimer la ressource « ${row.designation} » ?`)) return;
    setBannerError(undefined);
    startTransition(async () => {
      try {
        await deleteOrganisateurSujetResourceAction({ sectionSlug, id: row.id });
        loadList(page, searchApplied);
      } catch (e) {
        setBannerError((e as Error).message);
      }
    });
  };

  const tablePageIndex = Math.max(0, page - 1);
  const pageCount = Math.max(1, Math.ceil(total / limit) || 1);
  const canCreate = programmes.length > 0 && juryRechercheMembers.length > 0;

  const toolbar = useMemo(
    () => (
      <div className="flex flex-col gap-4 sm:flex-row sm:flex-wrap sm:items-center sm:justify-between">
        <div>
          <h2 className="text-lg font-bold tracking-tight text-midnight_text dark:text-white">
            Sujets proposés aux étudiants
          </h2>
          <p className="mt-0.5 max-w-xl text-sm text-gray-600 dark:text-gray-400">
            Ressources « sujet » du service étudiant, filtrées par votre{" "}
            <code className="rounded bg-gray-100 px-1 text-xs dark:bg-gray-800">sectionRef</code>.
          </p>
        </div>
        <div className="flex w-full flex-col gap-2 sm:w-auto sm:flex-row sm:items-center">
          <input
            type="search"
            value={searchInput}
            onChange={(e) => setSearchInput(e.target.value)}
            placeholder="Filtrer par désignation…"
            disabled={pending}
            className="w-full min-w-[14rem] rounded-xl border border-gray-200 bg-white px-4 py-2.5 text-sm shadow-sm outline-none transition-shadow placeholder:text-gray-400 focus:border-primary/50 focus:ring-2 focus:ring-primary/20 dark:border-gray-600 dark:bg-gray-800 dark:text-white sm:w-64"
          />
          <div className="flex gap-2">
            <button
              type="button"
              onClick={() => {
                setSearchApplied(searchInput.trim());
                loadList(1, searchInput.trim());
              }}
              disabled={pending}
              className="inline-flex flex-1 items-center justify-center gap-1.5 rounded-xl border border-gray-200 bg-white px-4 py-2.5 text-sm font-semibold text-midnight_text shadow-sm transition hover:border-gray-300 hover:bg-gray-50 active:scale-[0.98] dark:border-gray-600 dark:bg-gray-900 dark:hover:bg-gray-800 sm:flex-initial"
            >
              <Icon icon="solar:magnifer-bold-duotone" className="h-4 w-4 text-primary" />
              Rechercher
            </button>
            {canCreate ? (
              <button
                type="button"
                onClick={openCreate}
                disabled={pending}
                className="inline-flex flex-1 items-center justify-center gap-1.5 rounded-xl bg-primary px-4 py-2.5 text-sm font-semibold text-white shadow-md transition hover:bg-darkprimary hover:shadow-lg active:scale-[0.98] dark:text-white sm:flex-initial"
              >
                <Icon icon="solar:add-circle-bold-duotone" className="h-5 w-5" />
                Nouvelle ressource
              </button>
            ) : null}
          </div>
        </div>
      </div>
    ),
    [canCreate, loadList, openCreate, pending, searchInput]
  );

  const listDescription = (
    <p className="flex flex-wrap items-center gap-2">
      <Icon icon="solar:buildings-3-bold-duotone" className="h-4 w-4 shrink-0 text-gray-400" />
      Section locale : <strong>{sectionDesignation}</strong>
      <span className="hidden sm:inline">—</span>
      <code className="rounded bg-gray-100 px-1 text-xs dark:bg-gray-800">sectionRef = {sectionRefDisplay}</code>
    </p>
  );

  const listSlot = (
    <>
      {programmes.length === 0 ? (
        <div className="flex gap-3 rounded-xl border border-amber-300/80 bg-amber-50/90 px-4 py-3 text-sm text-amber-950 dark:border-amber-800 dark:bg-amber-950/40 dark:text-amber-100">
          <Icon icon="solar:danger-triangle-bold-duotone" className="mt-0.5 h-5 w-5 shrink-0" />
          <p>
            Aucun programme n&apos;est rattaché à cette section en base locale. Créez d&apos;abord des programmes pour
            pouvoir associer une ressource sujet.
          </p>
        </div>
      ) : null}

      {juryRechercheMembers.length === 0 ? (
        <div className="flex gap-3 rounded-xl border border-amber-300/80 bg-amber-50/90 px-4 py-3 text-sm text-amber-950 dark:border-amber-800 dark:bg-amber-950/40 dark:text-amber-100">
          <Icon icon="solar:users-group-rounded-bold-duotone" className="mt-0.5 h-5 w-5 shrink-0" />
          <p>
            Le <strong>jury de recherche</strong> de la section n&apos;a pas encore été configuré. Les lecteurs doivent
            en faire partie : complétez le jury avant de créer des ressources.
          </p>
        </div>
      ) : null}

      {bannerError ? (
        <div className="flex gap-3 rounded-xl border border-amber-300/80 bg-amber-50/90 px-4 py-3 text-sm text-amber-950 dark:border-amber-800 dark:bg-amber-950/40 dark:text-amber-100">
          <Icon icon="solar:info-circle-bold-duotone" className="mt-0.5 h-5 w-5 shrink-0" />
          <p>{bannerError}</p>
        </div>
      ) : null}

      {toolbar}

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
          <Icon icon="solar:documents-bold-duotone" className="mb-3 h-14 w-14 text-gray-400" />
          <p className="font-semibold text-midnight_text dark:text-white">Aucune ressource sujet pour cette section</p>
          <p className="mt-1 max-w-sm text-sm text-gray-500 dark:text-gray-400">
            Lancez une recherche ou créez une première ressource lorsque le jury de recherche est configuré.
          </p>
        </div>
      ) : (
        <div
          className={`grid gap-4 sm:grid-cols-2 xl:grid-cols-3 ${pending ? "pointer-events-none opacity-70" : ""}`}
          aria-busy={pending}
        >
          {rows.map((r) => {
            const st = (r.status || "—").toLowerCase();
            const active = st === "active" || st === "published" || st === "disponible";
            return (
              <article
                key={r.id}
                className="group relative flex flex-col overflow-hidden rounded-2xl border border-gray-200/90 bg-white shadow-md transition-all duration-300 ease-out hover:-translate-y-1.5 hover:border-primary/40 hover:shadow-xl dark:border-gray-700 dark:bg-gray-900"
              >
                <div className="pointer-events-none absolute inset-x-0 top-0 h-1 origin-left scale-x-0 bg-gradient-to-r from-primary via-primary to-sky-400 transition-transform duration-300 group-hover:scale-x-100" />
                <div className="flex flex-1 flex-col p-5 pt-6">
                  <div className="flex items-start justify-between gap-2">
                    <h3 className="line-clamp-2 text-base font-bold leading-snug text-midnight_text dark:text-white">
                      {r.designation}
                    </h3>
                    <span
                      className={`shrink-0 rounded-full px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-wide ${
                        active
                          ? "bg-primary/15 text-primary dark:bg-primary/25 dark:text-sky-100"
                          : "bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-300"
                      }`}
                    >
                      {r.status || "—"}
                    </span>
                  </div>
                  <p className="mt-1.5 flex items-center gap-1 font-mono text-[11px] text-gray-400">
                    <Icon icon="solar:hashtag-bold-duotone" className="h-3 w-3" />
                    {r.id.slice(-10)}
                  </p>

                  <div className="mt-4 flex flex-wrap gap-2">
                    <span className="inline-flex items-center gap-1.5 rounded-lg bg-gray-100 px-2.5 py-1 text-xs font-semibold tabular-nums text-midnight_text dark:bg-gray-800 dark:text-white">
                      <Icon icon="solar:wad-of-money-bold-duotone" className="h-3.5 w-3.5 text-primary" />
                      {r.amount} {r.currency}
                    </span>
                    <span className="inline-flex items-center gap-1.5 rounded-lg bg-gray-100 px-2.5 py-1 text-xs font-medium text-gray-700 dark:bg-gray-800 dark:text-gray-200">
                      <Icon icon="solar:book-bold-duotone" className="h-3.5 w-3.5 text-primary" />
                      {creditsLabel(r, programmes)}
                    </span>
                  </div>

                  <p className="mt-3 flex items-start gap-2 text-xs text-gray-600 dark:text-gray-400">
                    <Icon icon="solar:diploma-bold-duotone" className="mt-0.5 h-4 w-4 shrink-0 text-primary" />
                    <span className="line-clamp-2">{programmeLabel(r.matiereReference) || "—"}</span>
                  </p>
                  {r.lecteursLabel ? (
                    <p className="mt-2 line-clamp-2 text-xs text-gray-500 dark:text-gray-500">
                      <span className="font-medium text-gray-600 dark:text-gray-400">Lecteurs : </span>
                      {r.lecteursLabel}
                    </p>
                  ) : null}

                  <div className="mt-auto flex flex-wrap gap-2 border-t border-gray-100 pt-4 dark:border-gray-800">
                    <Link
                      href={`/section/recherche/ressources-sujets/sujets/${r.id}`}
                      className="inline-flex flex-1 items-center justify-center gap-1.5 rounded-xl border border-gray-200 bg-gray-50/80 px-3 py-2 text-xs font-semibold text-midnight_text transition hover:border-primary/40 hover:bg-primary/5 dark:border-gray-600 dark:bg-gray-800/80 dark:hover:bg-gray-800"
                    >
                      <Icon icon="solar:cart-check-bold-duotone" className="h-4 w-4 text-primary" />
                      Demandes
                    </Link>
                    <button
                      type="button"
                      onClick={() => openEdit(r)}
                      className="inline-flex flex-1 items-center justify-center gap-1.5 rounded-xl border border-transparent bg-primary/10 px-3 py-2 text-xs font-semibold text-primary transition hover:bg-primary/15 dark:bg-primary/20"
                    >
                      <Icon icon="solar:pen-new-square-bold-duotone" className="h-4 w-4" />
                      Modifier
                    </button>
                    <button
                      type="button"
                      onClick={() => onDelete(r)}
                      className="inline-flex items-center justify-center rounded-xl border border-rose-200/80 bg-rose-50/80 px-3 py-2 text-xs font-semibold text-rose-700 transition hover:bg-rose-100 dark:border-rose-900/50 dark:bg-rose-950/40 dark:text-rose-200 dark:hover:bg-rose-950/60"
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
              disabled={tablePageIndex <= 0 || pending}
              onClick={() => loadList(page - 1, searchApplied)}
              className="rounded-xl border border-gray-200 bg-white px-4 py-2 text-sm font-medium shadow-sm transition hover:bg-gray-50 disabled:opacity-40 dark:border-gray-600 dark:bg-gray-900 dark:hover:bg-gray-800"
            >
              Précédent
            </button>
            <button
              type="button"
              disabled={pending || tablePageIndex + 1 >= pageCount || total === 0}
              onClick={() => loadList(page + 1, searchApplied)}
              className="rounded-xl border border-gray-200 bg-white px-4 py-2 text-sm font-medium shadow-sm transition hover:bg-gray-50 disabled:opacity-40 dark:border-gray-600 dark:bg-gray-900 dark:hover:bg-gray-800"
            >
              Suivant
            </button>
          </div>
        </div>
      ) : null}
    </>
  );

  const formSlot = (
    <OrganisateurSujetResourceForm
      mode={uiMode === "create" ? "create" : "edit"}
      editingId={editingId}
      sectionSlug={sectionSlug}
      sectionDesignation={sectionDesignation}
      programmes={programmes}
      juryRechercheMembers={juryRechercheMembers}
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
      title="Ressources sujets — recherche"
      titleIcon="solar:library-bold-duotone"
      description={listDescription}
      mode={uiMode}
      listSlot={listSlot}
      formSlot={formSlot}
    />
  );
}
