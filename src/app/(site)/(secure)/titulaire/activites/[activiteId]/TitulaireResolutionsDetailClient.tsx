"use client";

import { useMemo, useState } from "react";
import {
  updateResolutionNote,
  type ActiviteDetailView,
  type ResolutionRow,
} from "@/actions/titulaireActivites";
import { buildActiviteResolutionsXlsxBuffer } from "@/lib/resolutions/buildActiviteResolutionsExportWorkbook";

type Props = {
  activiteId: string;
  activite: ActiviteDetailView | null;
  rows: ResolutionRow[];
};

function formatDate(iso: string): string {
  if (!iso) return "—";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return iso;
  return new Intl.DateTimeFormat("fr-FR", { dateStyle: "full", timeStyle: "short" }).format(d);
}

export default function TitulaireResolutionsDetailClient({ activiteId, activite, rows }: Props) {
  const [localRows, setLocalRows] = useState<ResolutionRow[]>(rows);
  const [savingId, setSavingId] = useState<string | null>(null);
  const [msg, setMsg] = useState<string | null>(null);
  const [err, setErr] = useState<string | null>(null);

  const total = localRows.length;
  const submitted = useMemo(() => rows.filter((r) => r.status).length, [rows]);
  const average = useMemo(() => {
    if (localRows.length === 0) return 0;
    const sum = localRows.reduce((acc, row) => acc + Number(row.note || 0), 0);
    return Number((sum / localRows.length).toFixed(2));
  }, [localRows]);

  async function onSaveNote(row: ResolutionRow) {
    setSavingId(row.id);
    setErr(null);
    setMsg(null);
    const r = await updateResolutionNote({ resolutionId: row.id, note: Number(row.note ?? 0) });
    if (!r.ok) {
      setErr(r.message);
    } else {
      setMsg("Note mise à jour.");
    }
    setSavingId(null);
  }

  async function onExportExcel() {
    setErr(null);
    const buf = await buildActiviteResolutionsXlsxBuffer({
      activite: {
        id: activiteId,
        categorie: activite?.categorie ?? "TP",
        noteMaximale: Number(activite?.noteMaximale ?? 0),
        dateRemise: activite?.dateRemise ?? "",
        status: activite?.status ?? "",
      },
      rows: localRows,
    });
    const blob = new Blob([buf], {
      type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
    });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `resolutions-${activiteId.slice(-8)}.xlsx`;
    a.click();
    URL.revokeObjectURL(url);
  }

  return (
    <div className="space-y-4">
      <div className="rounded-lg border border-gray-100 bg-gray-50/80 px-3 py-2 text-sm dark:border-gray-800 dark:bg-gray-800/40">
        <p className="text-xs text-gray-500 dark:text-gray-400">Activité</p>
        <p className="font-mono text-xs text-gray-700 dark:text-gray-300">{activiteId}</p>
        <p className="mt-1 text-xs text-gray-500">
          Soumissions: <strong>{total}</strong> · Validées: <strong>{submitted}</strong> · Moyenne:{" "}
          <strong>{average}</strong>
        </p>
        <p className="mt-1 text-xs text-gray-500">
          Catégorie: <strong>{activite?.categorie ?? "—"}</strong> · Note max:{" "}
          <strong>{activite?.noteMaximale ?? 0}</strong>
        </p>
      </div>
      {msg ? <p className="rounded-md border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm text-emerald-700">{msg}</p> : null}
      {err ? <p className="rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">{err}</p> : null}
      <div className="flex justify-end">
        <button
          type="button"
          onClick={() => void onExportExcel()}
          className="rounded-md border border-[#082b1c] px-3 py-2 text-xs font-semibold text-[#082b1c] dark:border-[#5ec998] dark:text-[#5ec998]"
        >
          Exporter Excel (.xlsx)
        </button>
      </div>
      {rows.length === 0 ? (
        <p className="text-sm text-gray-600 dark:text-gray-400">Aucune résolution soumise pour cette activité.</p>
      ) : (
        <div className="overflow-x-auto rounded-lg border border-gray-200 dark:border-gray-700">
          <table className="min-w-full divide-y divide-gray-200 text-sm dark:divide-gray-700">
            <thead className="bg-gray-50 dark:bg-gray-800/80">
              <tr>
                <th className="px-3 py-2 text-left text-xs font-semibold">Matricule</th>
                <th className="px-3 py-2 text-left text-xs font-semibold">Email</th>
                <th className="px-3 py-2 text-left text-xs font-semibold">Matière</th>
                <th className="px-3 py-2 text-left text-xs font-semibold">Note</th>
                <th className="px-3 py-2 text-left text-xs font-semibold">Statut</th>
                <th className="px-3 py-2 text-left text-xs font-semibold">Soumis le</th>
                <th className="px-3 py-2 text-left text-xs font-semibold">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100 bg-white dark:divide-gray-800 dark:bg-gray-900/40">
              {localRows.map((r) => (
                <tr key={r.id}>
                  <td className="whitespace-nowrap px-3 py-2 font-mono text-xs">{r.matricule || "—"}</td>
                  <td className="px-3 py-2">{r.email || "—"}</td>
                  <td className="px-3 py-2">{r.matiere || "—"}</td>
                  <td className="px-3 py-2">
                    <input
                      type="number"
                      min={0}
                      max={Number(activite?.noteMaximale ?? 100)}
                      value={Number.isFinite(r.note) ? r.note : 0}
                      onChange={(e) =>
                        setLocalRows((prev) =>
                          prev.map((x) => (x.id === r.id ? { ...x, note: Number(e.target.value ?? 0) } : x))
                        )
                      }
                      className="w-24 rounded-md border border-gray-300 px-2 py-1 text-xs dark:border-gray-600 dark:bg-gray-800 dark:text-white"
                    />
                  </td>
                  <td className="px-3 py-2">{r.status ? "Validé" : "En attente"}</td>
                  <td className="px-3 py-2">{formatDate(r.submittedAt)}</td>
                  <td className="px-3 py-2">
                    <button
                      type="button"
                      onClick={() => void onSaveNote(r)}
                      disabled={savingId === r.id}
                      className="rounded-md bg-[#082b1c] px-3 py-1 text-xs font-semibold text-white disabled:opacity-50 dark:bg-[#5ec998] dark:text-gray-900"
                    >
                      {savingId === r.id ? "..." : "Ajuster"}
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
