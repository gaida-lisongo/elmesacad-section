"use client";

import { useCallback, useEffect, useState } from "react";
import { Icon } from "@iconify/react";
import type { RechargeExportPeriod } from "@/lib/recharges/exportPeriodRange";
import { useDebouncedValue } from "@/components/dashboard/tables/useDebouncedValue";

type RechargeRow = {
  id: string;
  studentName: string;
  studentMatricule: string;
  amount: number;
  currency: "USD" | "CDF";
  status: "pending" | "paid" | "failed";
  createdAt: string;
};

/** Tableau + export des recharges (habilitation WM côté dashboard). */
export function TransactionsPanel() {
  const [rows, setRows] = useState<RechargeRow[]>([]);
  const [search, setSearch] = useState("");
  const debouncedSearch = useDebouncedValue(search, 350);
  const [status, setStatus] = useState<"all" | "pending" | "paid" | "failed">("all");
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const [exportPeriod, setExportPeriod] = useState<RechargeExportPeriod>("daily");
  const [exportDate, setExportDate] = useState(() => new Date().toISOString().slice(0, 10));
  const [exportLoading, setExportLoading] = useState(false);
  const [exportErr, setExportErr] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setErr(null);
    try {
      const sp = new URLSearchParams();
      sp.set("page", "0");
      sp.set("limit", "8");
      sp.set("status", status);
      sp.set("search", debouncedSearch.trim());
      const res = await fetch(`/api/recharges?${sp.toString()}`);
      const j = await res.json();
      if (!res.ok) throw new Error(j.message || "Chargement transactions impossible");
      setRows(Array.isArray(j.data) ? (j.data as RechargeRow[]) : []);
    } catch (e) {
      setErr((e as Error).message);
    } finally {
      setLoading(false);
    }
  }, [debouncedSearch, status]);

  useEffect(() => {
    void load();
  }, [load]);

  const downloadExport = async () => {
    setExportLoading(true);
    setExportErr(null);
    try {
      const sp = new URLSearchParams();
      sp.set("period", exportPeriod);
      sp.set("date", exportDate);
      const res = await fetch(`/api/recharges/export?${sp.toString()}`);
      if (!res.ok) {
        const j = (await res.json().catch(() => ({}))) as { message?: string };
        throw new Error(j.message || "Export impossible");
      }
      const blob = await res.blob();
      const cd = res.headers.get("Content-Disposition");
      let filename = `recharges-rapport-${exportPeriod}-${exportDate}.xlsx`;
      const m = cd?.match(/filename="([^"]+)"/);
      if (m?.[1]) filename = m[1];
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = filename;
      document.body.appendChild(a);
      a.click();
      a.remove();
      URL.revokeObjectURL(url);
    } catch (e) {
      setExportErr((e as Error).message);
    } finally {
      setExportLoading(false);
    }
  };

  return (
    <article className="animate-dashboard-in w-full min-w-0 rounded-xl border border-gray-200/80 bg-white p-4 shadow-sm dark:border-gray-800 dark:bg-gray-900/70">
      <h2 className="text-sm font-semibold text-midnight_text dark:text-white">Détail des recharges</h2>

      <div className="mt-3 rounded-lg border border-sky-200/80 bg-sky-50/50 p-3 dark:border-sky-900/40 dark:bg-sky-950/20">
        <p className="text-xs font-medium text-midnight_text dark:text-white">Rapports Excel (webmaster)</p>
        <p className="mt-1 text-[11px] text-gray-600 dark:text-gray-400">
          Fichier avec feuille <strong>Synthèse</strong> et feuille <strong>Données sources</strong>. Périodes en UTC
          (calendrier grégorien) ; le semestre = janv.–juin / juil.–déc.
        </p>
        <div className="mt-2 flex flex-wrap items-end gap-2">
          <label className="text-[11px] text-gray-600 dark:text-gray-300">
            Période
            <select
              className="mt-0.5 block rounded border border-gray-200 bg-white px-2 py-1.5 text-sm dark:border-gray-700 dark:bg-gray-800"
              value={exportPeriod}
              onChange={(e) => setExportPeriod(e.target.value as RechargeExportPeriod)}
              disabled={exportLoading}
            >
              <option value="daily">Journalier</option>
              <option value="monthly">Mensuel</option>
              <option value="semester">Semestriel</option>
              <option value="annual">Annuel</option>
            </select>
          </label>
          <label className="text-[11px] text-gray-600 dark:text-gray-300">
            Date de référence
            <input
              type="date"
              className="mt-0.5 block rounded border border-gray-200 bg-white px-2 py-1.5 text-sm dark:border-gray-700 dark:bg-gray-800"
              value={exportDate}
              onChange={(e) => setExportDate(e.target.value)}
              disabled={exportLoading}
            />
          </label>
          <button
            type="button"
            disabled={exportLoading}
            onClick={() => void downloadExport()}
            className="inline-flex items-center gap-1.5 rounded-lg bg-primary px-3 py-2 text-xs font-semibold text-white dark:bg-primary dark:text-white"
          >
            {exportLoading ? (
              <Icon icon="svg-spinners:ring-resize" className="size-4" />
            ) : (
              <Icon icon="solar:document-text-bold" className="size-4" />
            )}
            Télécharger Excel
          </button>
        </div>
        {exportErr ? (
          <p className="mt-2 text-xs text-red-600 dark:text-red-400" role="alert">
            {exportErr}
          </p>
        ) : null}
      </div>

      <div className="mt-3 flex flex-wrap gap-2">
        <input
          className="rounded border border-gray-200 px-2 py-1.5 text-sm dark:border-gray-700 dark:bg-gray-800"
          placeholder="Nom, matricule, montant..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
        <select
          className="rounded border border-gray-200 px-2 py-1.5 text-sm dark:border-gray-700 dark:bg-gray-800"
          value={status}
          onChange={(e) => setStatus(e.target.value as "all" | "pending" | "paid" | "failed")}
        >
          <option value="all">Tous</option>
          <option value="pending">En attente</option>
          <option value="paid">Payé</option>
          <option value="failed">Échoué</option>
        </select>
      </div>
      {err && <p className="mt-2 text-xs text-red-600">{err}</p>}
      <div className="mt-3 overflow-x-auto">
        <table className="min-w-full text-left text-sm">
          <thead>
            <tr className="border-b border-gray-200 dark:border-gray-700">
              <th className="px-2 py-1.5 text-xs text-gray-500">Étudiant</th>
              <th className="px-2 py-1.5 text-xs text-gray-500">Montant</th>
              <th className="px-2 py-1.5 text-xs text-gray-500">Statut</th>
              <th className="px-2 py-1.5 text-xs text-gray-500">Date</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr>
                <td className="px-2 py-3 text-gray-500" colSpan={4}>
                  Chargement...
                </td>
              </tr>
            ) : rows.length === 0 ? (
              <tr>
                <td className="px-2 py-3 text-gray-500" colSpan={4}>
                  Aucune transaction
                </td>
              </tr>
            ) : (
              rows.map((r) => (
                <tr key={r.id} className="border-b border-gray-100 dark:border-gray-800">
                  <td className="px-2 py-1.5">
                    <p className="text-sm text-midnight_text dark:text-white">{r.studentName}</p>
                    <p className="text-[11px] text-gray-500">{r.studentMatricule}</p>
                  </td>
                  <td className="px-2 py-1.5">
                    {r.amount} {r.currency}
                  </td>
                  <td className="px-2 py-1.5">{r.status}</td>
                  <td className="px-2 py-1.5">{new Date(r.createdAt).toLocaleDateString()}</td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </article>
  );
}
