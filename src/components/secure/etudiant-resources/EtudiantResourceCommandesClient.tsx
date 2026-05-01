"use client";

import Link from "next/link";
import { useCallback, useMemo, useState, useTransition } from "react";
import { Icon } from "@iconify/react";
import { listEtudiantResourceCommandesAction } from "@/actions/etudiantResourceCommandes";
import type { EtudiantResourceCommandeContext } from "@/actions/etudiantResourceCommandes";
import type { SujetCommandeListRow } from "@/actions/organisateurSujetResources";
import { DataTable, type DataTableColumn } from "@/components/data/DataTable";

type Props = {
  context: EtudiantResourceCommandeContext;
  sectionSlug: string;
  resourceId: string;
  resourceDesignation: string;
  backHref: string;
  backLabel: string;
  initialData: { rows: SujetCommandeListRow[]; total: number; page: number; limit: number };
  initialError?: string;
  toolbarTitle?: string;
  toolbarDescription?: string;
};

/**
 * Consultation paginée des commandes pour une ressource du service étudiant.
 * Le `context` détermine quelle logique serveur est utilisée (extensible : stage, fiche-validation…).
 */
export default function EtudiantResourceCommandesClient({
  context,
  sectionSlug,
  resourceId,
  resourceDesignation,
  backHref,
  backLabel,
  initialData,
  initialError,
  toolbarTitle = "Demandes enregistrées",
  toolbarDescription = "Commandes liées à cette ressource (service étudiant).",
}: Props) {
  const [rows, setRows] = useState<SujetCommandeListRow[]>(initialData.rows);
  const [total, setTotal] = useState(initialData.total);
  const [page, setPage] = useState(initialData.page);
  const [limit] = useState(initialData.limit);
  const [bannerError, setBannerError] = useState<string | undefined>(initialError);
  const [pending, startTransition] = useTransition();

  const load = useCallback(
    (nextPage: number) => {
      setBannerError(undefined);
      startTransition(async () => {
        try {
          const res = await listEtudiantResourceCommandesAction({
            context,
            sectionSlug,
            resourceId,
            page: nextPage,
            limit,
          });
          setRows(res.rows);
          setTotal(res.total);
          setPage(res.page);
        } catch (e) {
          setBannerError((e as Error).message);
        }
      });
    },
    [context, sectionSlug, resourceId, limit]
  );

  const tablePageIndex = Math.max(0, page - 1);

  const columns: DataTableColumn<SujetCommandeListRow>[] = useMemo(
    () => [
      {
        id: "order",
        header: "Commande",
        cell: (r) => (
          <div className="flex flex-col gap-0.5">
            <span className="font-mono text-xs font-semibold text-midnight_text dark:text-white">
              {r.orderNumber || r.id.slice(-10)}
            </span>
            {r.reference ? (
              <span className="text-[11px] text-gray-500">Réf. {r.reference}</span>
            ) : null}
          </div>
        ),
      },
      {
        id: "student",
        header: "Étudiant",
        cell: (r) => (
          <div>
            <p className="font-medium">{r.matricule || "—"}</p>
            <p className="text-xs text-gray-500">{r.studentEmail || "—"}</p>
          </div>
        ),
      },
      {
        id: "payment",
        header: "Paiement",
        cell: (r) => {
          const p = (r.payment || "—").toLowerCase();
          const ok = p === "success";
          return (
            <span
              className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-semibold ${
                ok
                  ? "bg-primary/15 text-primary dark:bg-primary/25 dark:text-sky-100"
                  : "bg-amber-100 text-amber-900 dark:bg-amber-950/40 dark:text-amber-100"
              }`}
            >
              {r.payment || "—"}
            </span>
          );
        },
      },
      {
        id: "created",
        header: "Date",
        cell: (r) => (
          <span className="text-xs text-gray-600 dark:text-gray-400">
            {r.createdAt ? new Date(r.createdAt).toLocaleString("fr-FR") : "—"}
          </span>
        ),
      },
    ],
    []
  );

  return (
    <div className="w-full min-w-0 space-y-6">
      <header className="border-b border-gray-200 pb-4 dark:border-gray-700">
        <Link
          href={backHref}
          className="mb-3 inline-flex items-center gap-1 text-sm font-medium text-primary hover:underline"
        >
          <Icon icon="solar:arrow-left-linear" className="h-4 w-4" aria-hidden />
          {backLabel}
        </Link>
        <h1 className="flex flex-wrap items-center gap-2 text-2xl font-bold text-midnight_text dark:text-white">
          <Icon icon="solar:cart-check-bold-duotone" className="h-8 w-8 shrink-0 text-primary" aria-hidden />
          Commandes — {resourceDesignation}
        </h1>
        <p className="mt-1 text-sm text-gray-600 dark:text-gray-400">
          Ressource <code className="rounded bg-gray-100 px-1 text-xs dark:bg-gray-800">{resourceId}</code>
        </p>
      </header>

      {bannerError ? (
        <div className="flex gap-3 rounded-lg border border-amber-300 bg-amber-50 px-4 py-3 text-sm text-amber-900 dark:border-amber-800 dark:bg-amber-950/40 dark:text-amber-100">
          <Icon icon="solar:info-circle-bold-duotone" className="mt-0.5 h-5 w-5 shrink-0" aria-hidden />
          <p>{bannerError}</p>
        </div>
      ) : null}

      <DataTable<SujetCommandeListRow>
        toolbarTitle={toolbarTitle}
        toolbarDescription={toolbarDescription}
        columns={columns}
        rows={rows}
        isLoading={pending}
        emptyMessage="Aucune commande pour cette ressource."
        searchPlaceholder=""
        searchValue=""
        onSearchChange={() => {}}
        showSearch={false}
        pagination={{
          page: tablePageIndex,
          pageSize: limit,
          total,
          onPageChange: (p) => load(p + 1),
        }}
      />
    </div>
  );
}
