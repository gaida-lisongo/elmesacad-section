"use client";

import { useCallback, useEffect, useState } from "react";
import { Icon } from "@iconify/react";
import type { DashboardTableRow } from "@/lib/dashboard/types";
import { MailAccountPasswordModal, type MailModalState } from "@/components/dashboard/tables/MailAccountPasswordModal";
import { useDebouncedValue } from "@/components/dashboard/tables/useDebouncedValue";

const PAGE_SIZE = 10;
const TABLE_HEADERS_BASE = ["Nom", "E-mail", "Matricule", "Statut", "Type"];

export function AdminUserTableBlock({
  listes,
  filters,
  canManageAccounts,
}: {
  listes: string[];
  filters: string[];
  canManageAccounts: boolean;
}) {
  const [listI, setListI] = useState(0);
  const [filterI, setFilterI] = useState(() => {
    const i = filters.indexOf("Inactifs");
    return i >= 0 ? i : 0;
  });
  const [search, setSearch] = useState("");
  const debouncedSearch = useDebouncedValue(search, 400);
  const [page, setPage] = useState(0);
  const [rows, setRows] = useState<DashboardTableRow[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const [mailModal, setMailModal] = useState<MailModalState>(null);
  const [mailModalErr, setMailModalErr] = useState<string | null>(null);
  const [mailBusy, setMailBusy] = useState(false);

  const listLabel = listes[listI] ?? listes[0] ?? "Étudiants";
  const userType: "Agent" | "Student" = /^agents$/i.test(listLabel.trim()) ? "Agent" : "Student";
  const filterKey = filters[filterI] ?? "Tous";
  const statusParam =
    filterKey === "Actifs" ? "active" : filterKey === "Inactifs" ? "inactive" : "all";

  const load = useCallback(async () => {
    setErr(null);
    setLoading(true);
    try {
      const sp = new URLSearchParams();
      sp.set("userType", userType === "Agent" ? "Agent" : "Student");
      sp.set("status", statusParam);
      sp.set("search", debouncedSearch.trim());
      sp.set("page", String(page));
      sp.set("limit", String(PAGE_SIZE));
      const res = await fetch(`/api/dashboard/users?${sp.toString()}`);
      const j = await res.json();
      if (!res.ok) throw new Error(j.message || "Chargement impossible");
      setRows(j.data as DashboardTableRow[]);
      setTotal(typeof j.total === "number" ? j.total : 0);
    } catch (e) {
      setErr((e as Error).message);
    } finally {
      setLoading(false);
    }
  }, [userType, statusParam, debouncedSearch, page]);

  useEffect(() => {
    void load();
  }, [load]);

  useEffect(() => {
    setPage(0);
  }, [userType, statusParam, debouncedSearch]);

  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));
  const pageSafe = Math.min(page, totalPages - 1);

  useEffect(() => {
    if (page !== pageSafe) setPage(pageSafe);
  }, [page, pageSafe]);

  const closeMailModal = () => {
    if (mailBusy) return;
    setMailModal(null);
    setMailModalErr(null);
  };

  const submitMailPassword = async (password: string) => {
    if (!mailModal) return;
    setMailModalErr(null);
    setMailBusy(true);
    try {
      const res = await fetch("/api/dashboard/mail-accounts", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: mailModal.email, action: mailModal.kind, password }),
      });
      const j = await res.json();
      if (!res.ok) throw new Error(j.message || "Action impossible");
      setMailModal(null);
      setMailModalErr(null);
    } catch (e) {
      setMailModalErr((e as Error).message);
    } finally {
      setMailBusy(false);
    }
  };

  return (
    <div>
      <div className="mb-3 flex flex-wrap items-end gap-3">
        <label className="text-xs text-gray-600 dark:text-gray-300">
          Liste
          <select
            className="ml-1 mt-0.5 block rounded border border-gray-200 bg-white px-2 py-1.5 text-sm dark:border-gray-700 dark:bg-gray-800"
            value={listI}
            onChange={(e) => setListI(Number(e.target.value))}
          >
            {listes.map((l, i) => (
              <option key={l} value={i}>
                {l}
              </option>
            ))}
          </select>
        </label>
        <label className="text-xs text-gray-600 dark:text-gray-300">
          Filtre
          <select
            className="ml-1 mt-0.5 block rounded border border-gray-200 bg-white px-2 py-1.5 text-sm dark:border-gray-700 dark:bg-gray-800"
            value={filterI}
            onChange={(e) => setFilterI(Number(e.target.value))}
          >
            {filters.map((f, i) => (
              <option key={f} value={i}>
                {f}
              </option>
            ))}
          </select>
        </label>
        <label className="min-w-[10rem] flex-1 text-xs text-gray-600 dark:text-gray-300 sm:min-w-[14rem]">
          Recherche
          <input
            className="mt-0.5 w-full rounded border border-gray-200 bg-white px-2 py-1.5 text-sm dark:border-gray-700 dark:bg-gray-800"
            placeholder="Nom, e-mail, matricule"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </label>
      </div>
      {err && (
        <p className="mb-2 text-xs text-red-600" role="alert">
          {err}
        </p>
      )}
      <div className="overflow-x-auto">
        <table className="min-w-full text-left text-sm">
          <thead>
            <tr className="border-b border-gray-200 dark:border-gray-700">
              {TABLE_HEADERS_BASE.map((header) => (
                <th
                  key={header}
                  className="px-3 py-2 text-xs uppercase tracking-wide text-gray-500"
                >
                  {header}
                </th>
              ))}
              <th className="px-3 py-2 text-xs uppercase tracking-wide text-gray-500">Actions</th>
            </tr>
          </thead>
          <tbody>
            {loading && (
              <tr>
                <td
                  colSpan={6}
                  className="px-3 py-6 text-center text-gray-500"
                >
                  Chargement…
                </td>
              </tr>
            )}
            {!loading && rows.length === 0 && (
              <tr>
                <td
                  colSpan={6}
                  className="px-3 py-6 text-center text-gray-500"
                >
                  Aucun résultat
                </td>
              </tr>
            )}
            {!loading &&
              rows.map((row) => {
                const email = row.columns[1] ?? "";
                const rowMailBusy = mailBusy && mailModal?.rowId === row.id;
                return (
                  <tr
                    key={row.id}
                    className="border-b border-gray-100 transition-colors hover:bg-sky-50/50 dark:border-gray-800 dark:hover:bg-sky-950/20"
                  >
                    {row.columns.map((col, idx) => (
                      <td
                        key={`${row.id}-c${idx}`}
                        className="px-3 py-2 text-gray-700 dark:text-gray-200"
                      >
                        {col}
                      </td>
                    ))}
                    <td className="px-3 py-2">
                      {canManageAccounts ? (
                        <div className="flex flex-wrap gap-1">
                          <button
                            type="button"
                            disabled={mailBusy}
                            onClick={() => {
                              setMailModalErr(null);
                              setMailModal({ email, rowId: row.id, kind: "create" });
                            }}
                            className="rounded border border-sky-500/60 px-2 py-0.5 text-xs text-sky-700 dark:text-sky-300"
                          >
                            {rowMailBusy && mailModal?.kind === "create" ? "…" : "Créer compte"}
                          </button>
                          <button
                            type="button"
                            disabled={mailBusy}
                            onClick={() => {
                              setMailModalErr(null);
                              setMailModal({ email, rowId: row.id, kind: "reset" });
                            }}
                            className="rounded border border-amber-500/60 px-2 py-0.5 text-xs text-amber-800 dark:text-amber-200"
                          >
                            {rowMailBusy && mailModal?.kind === "reset" ? "…" : "Réinitialiser"}
                          </button>
                        </div>
                      ) : (
                        <span className="text-xs text-gray-400">Non autorisé</span>
                      )}
                    </td>
                  </tr>
                );
              })}
          </tbody>
        </table>
      </div>
      <div className="mt-3 flex items-center justify-between text-xs text-gray-600 dark:text-gray-400">
        <span>
          {total} résultat{total > 1 ? "s" : ""} — page {page + 1} / {totalPages}
        </span>
        <div className="flex gap-2">
          <button
            type="button"
            disabled={page <= 0 || loading}
            onClick={() => setPage((p) => Math.max(0, p - 1))}
            className="rounded border border-gray-300 px-2 py-1 dark:border-gray-600"
          >
            Préc.
          </button>
          <button
            type="button"
            disabled={page >= totalPages - 1 || loading}
            onClick={() => setPage((p) => p + 1)}
            className="rounded border border-gray-300 px-2 py-1 dark:border-gray-600"
          >
            Suiv.
          </button>
        </div>
      </div>

      <MailAccountPasswordModal
        state={mailModal}
        busy={mailBusy}
        apiErr={mailModalErr}
        onClose={closeMailModal}
        onSubmitPassword={(pwd) => void submitMailPassword(pwd)}
      />
    </div>
  );
}
