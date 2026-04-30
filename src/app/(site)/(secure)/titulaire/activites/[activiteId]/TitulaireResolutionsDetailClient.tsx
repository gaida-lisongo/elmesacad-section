"use client";

import { useMemo } from "react";
import type { ResolutionRow } from "@/actions/titulaireActivites";

type Props = {
  activiteId: string;
  rows: ResolutionRow[];
};

function formatDate(iso: string): string {
  if (!iso) return "—";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return iso;
  return new Intl.DateTimeFormat("fr-FR", { dateStyle: "full", timeStyle: "short" }).format(d);
}

export default function TitulaireResolutionsDetailClient({ activiteId, rows }: Props) {
  const total = rows.length;
  const submitted = useMemo(() => rows.filter((r) => r.status).length, [rows]);
  const average = useMemo(() => {
    if (rows.length === 0) return 0;
    const sum = rows.reduce((acc, row) => acc + Number(row.note || 0), 0);
    return Number((sum / rows.length).toFixed(2));
  }, [rows]);

  return (
    <div className="space-y-4">
      <div className="rounded-lg border border-gray-100 bg-gray-50/80 px-3 py-2 text-sm dark:border-gray-800 dark:bg-gray-800/40">
        <p className="text-xs text-gray-500 dark:text-gray-400">Activité</p>
        <p className="font-mono text-xs text-gray-700 dark:text-gray-300">{activiteId}</p>
        <p className="mt-1 text-xs text-gray-500">
          Soumissions: <strong>{total}</strong> · Validées: <strong>{submitted}</strong> · Moyenne:{" "}
          <strong>{average}</strong>
        </p>
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
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100 bg-white dark:divide-gray-800 dark:bg-gray-900/40">
              {rows.map((r) => (
                <tr key={r.id}>
                  <td className="whitespace-nowrap px-3 py-2 font-mono text-xs">{r.matricule || "—"}</td>
                  <td className="px-3 py-2">{r.email || "—"}</td>
                  <td className="px-3 py-2">{r.matiere || "—"}</td>
                  <td className="px-3 py-2">{Number.isFinite(r.note) ? r.note : 0}</td>
                  <td className="px-3 py-2">{r.status ? "Validé" : "En attente"}</td>
                  <td className="px-3 py-2">{formatDate(r.submittedAt)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
