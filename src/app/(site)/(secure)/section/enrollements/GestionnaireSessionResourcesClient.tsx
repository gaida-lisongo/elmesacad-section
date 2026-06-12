"use client";

import Link from "next/link";
import { useCallback, useState, useTransition } from "react";
import { Icon } from "@iconify/react";
import type { SessionResourceRow } from "@/actions/gestionnaireSessionResources";
import {
  deleteGestionnaireSessionResourceAction,
  listGestionnaireSessionResourcesAction,
  patchGestionnaireSessionResourceStatusAction,
} from "@/actions/gestionnaireSessionResources";
import ResourceWorkspaceShell from "@/components/secure/etudiant-resources/ResourceWorkspaceShell";
import type { ResourceWorkspaceMode } from "@/components/secure/etudiant-resources/types";
import GestionnaireSessionResourceForm, { type ChefSectionDefaults } from "./GestionnaireSessionResourceForm";
import EnrollementPaymentWizard from "./EnrollementPaymentWizard";
import RessourceExamen from "./RessourceExamen";
import PercepteurCrud from "@/components/Common/PercepteurCrud";
import { usePrintCommunique } from "@/utils/usePrint";

type ProgrammeOption = { id: string; slug: string; designation: string; credits: number };

type Props = {
  sectionId: string;
  sectionSlug: string;
  sectionDesignation: string;
  programmes: ProgrammeOption[];
  chefSection: ChefSectionDefaults;
  initialData: { rows: SessionResourceRow[]; total: number; page: number; limit: number };
  initialError?: string;
};

function isPublicationActive(status: string): boolean {
  const st = (status || "").toLowerCase();
  return st === "active" || st === "published" || st === "disponible";
}

export default function GestionnaireSessionResourcesClient({
  sectionId,
  sectionSlug,
  sectionDesignation,
  programmes,
  chefSection,
  initialData,
  initialError,
}: Props) {
  const [rows, setRows] = useState<SessionResourceRow[]>(initialData.rows);
  const [row, setRow] = useState<SessionResourceRow | null>(null);
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

  const { generate } = usePrintCommunique();

  const loadList = useCallback(
    (nextPage: number, search: string) => {
      setBannerError(undefined);
      startTransition(async () => {
        try {
          const res = await listGestionnaireSessionResourcesAction({
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

  const openEdit = (row: SessionResourceRow) => {
    setEditingId(row.id);
    setUiMode("edit");
  };

  const onDelete = (row: SessionResourceRow) => {
    if (!window.confirm(`Supprimer la ressource « ${row.designation} » ?`)) return;
    setBannerError(undefined);
    setDeletingId(row.id);
    startTransition(async () => {
      try {
        await deleteGestionnaireSessionResourceAction({ sectionSlug, id: row.id });
        loadList(page, searchApplied);
      } catch (e) {
        setBannerError((e as Error).message);
      } finally {
        setDeletingId(null);
      }
    });
  };

  const togglePublicationStatus = (row: SessionResourceRow) => {
    const nextActive = !isPublicationActive(row.status);
    setBannerError(undefined);
    setStatusToggleId(row.id);
    void (async () => {
      try {
        const updated = await patchGestionnaireSessionResourceStatusAction({
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
  const canCreate = programmes.length > 0;

  const listDescription = (
    <p className="flex flex-wrap items-center gap-2">
      <Icon icon="solar:buildings-3-bold-duotone" className="h-4 w-4 shrink-0 text-gray-400" />
      Section : <strong>{sectionDesignation}</strong>
      {/* <span className="hidden sm:inline">—</span> */}
      {/* <code className="rounded bg-gray-100 px-1 text-xs dark:bg-gray-800">sectionRef = {sectionSlug}</code> */}
    </p>
  );

  const listSlot = (
    <>
      {!canCreate ? (
        <div className="flex gap-3 rounded-xl border border-amber-300/80 bg-amber-50/90 px-4 py-3 text-sm text-amber-950 dark:border-amber-800 dark:bg-amber-950/40 dark:text-amber-100">
          <Icon icon="solar:danger-triangle-bold-duotone" className="mt-0.5 h-5 w-5 shrink-0" />
          <p>
            Ajoutez au moins <strong>un programme</strong> en base locale pour créer une session d&apos;enrôlement.
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
            Enrollements — sessions d&apos;examen
          </h2>
          <p className="mt-0.5 max-w-xl text-sm text-gray-600 dark:text-gray-400">
            Gérez les sessions d&apos;enrôlement pour les examens de la section. {total} session{total > 1 ? "s" : ""} au total.
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
              <Link
                href={`/modalites/sessions`}
                className="inline-flex flex-1 items-center justify-center gap-1.5 rounded-xl border border-gray-200 bg-gray-50/80 px-3 py-2 text-xs font-semibold text-midnight_text transition hover:border-primary/40 hover:bg-primary/5 dark:border-gray-600 dark:bg-gray-800/80 dark:hover:bg-gray-800"
              >
                <Icon icon="solar:wallet-money-bold-duotone" className="h-4 w-4 text-primary" />
                Frais à payer
              </Link>
            ) : null}
            {canCreate ? (
              <button
                type="button"
                onClick={openCreate}
                disabled={pending}
                className="inline-flex flex-1 items-center justify-center gap-1.5 rounded-xl bg-primary px-4 py-2.5 text-sm font-semibold text-white shadow-md sm:flex-initial"
              >
                <Icon icon="solar:add-circle-bold-duotone" className="h-5 w-5" />
                Nouvelle session
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
          <Icon icon="solar:calendar-date-bold-duotone" className="mb-3 h-14 w-14 text-gray-400" />
          <p className="font-semibold text-midnight_text dark:text-white">Aucune session configurée</p>
          <p className="mt-1 max-w-sm text-sm text-gray-500 dark:text-gray-400">
            Créez une ressource lorsque les programmes sont disponibles.
          </p>
        </div>
      ) : (
        <div
          className={`grid gap-4 sm:grid-cols-2 xl:grid-cols-3 ${pending || deletingId ? "pointer-events-none opacity-70" : ""}`}
          aria-busy={pending || !!deletingId}
        >
          {rows.map((r) => (
            <RessourceExamen
              key={r.id}
              r={r}
              statusToggleId={statusToggleId}
              deletingId={deletingId}
              togglePublicationStatus={togglePublicationStatus}
              openEdit={openEdit}
              onDelete={onDelete}
              setRow={setRow}
              setUiMode={(mode: ResourceWorkspaceMode) => setUiMode(mode)}
              isPublicationActive={isPublicationActive}
              onGenerateReport={(r) => generate(r)}
              onManageCollectors={(r) => {
                setRow(r);
                setUiMode("percepteurs");
              }}
            />
          ))}
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

  const percepteurSlot = row ? (
    <PercepteurCrud
      r={row}
      onBack={() => {
        setRow(null);
        setUiMode("list");
      }}
    />
  ) : null;

  const formSlot = (
    <GestionnaireSessionResourceForm
      mode={uiMode === "create" ? "create" : "edit"}
      editingId={editingId}
      sectionId={sectionId}
      sectionSlug={sectionSlug}
      sectionDesignation={sectionDesignation}
      programmes={programmes}
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

  const paymentSlot = row ? (
    <EnrollementPaymentWizard
      resourceRow={row}
      sectionSlug={sectionSlug}
      onDone={() => {
        setRow(null);
        setUiMode("list");
      }}
      onCancel={() => {
        setRow(null);
        setUiMode("list");
      }}
    />
  ) : (
    <div className="flex flex-col items-center justify-center gap-6 rounded-2xl border border-gray-200/80 bg-gray-50/90 px-8 py-16 text-center dark:border-gray-700 dark:bg-gray-900/40">
      <Icon icon="solar:wallet-money-bold-duotone" className="h-14 w-14 text-primary" />
      <p className="text-lg font-bold text-midnight_text dark:text-white">Frais à payer</p>
      <p className="max-w-md text-sm text-gray-600 dark:text-gray-400">
        Veuillez d&apos;abord sélectionner une session d&apos;enrôlement pour gérer les paiements.
      </p>
    </div>
  );

  return (
    <ResourceWorkspaceShell
      title="Enrollements"
      titleIcon="solar:calendar-date-bold-duotone"
      description={listDescription}
      mode={uiMode}
      listSlot={listSlot}
      formSlot={formSlot}
      paymentSlot={paymentSlot}
      percepteurSlot={percepteurSlot}
    />
  );
}
