"use client";

import { useMemo, useState } from "react";
import { updatePresencesForSeance, type PresenceRowView } from "@/actions/titulairePresences";

type Initial = {
  seance: {
    id: string;
    label: string;
    dateSeance: string;
    jour: string;
    heureDebut: string;
    heureFin: string;
    salle: string;
    lecon: string;
    chargeId: string;
  };
  rows: PresenceRowView[];
};

const STATUS_OPTIONS: Array<{ value: PresenceRowView["status"]; label: string }> = [
  { value: "present", label: "Présent" },
  { value: "absent", label: "Absent" },
  { value: "late", label: "En retard" },
  { value: "early", label: "Sortie anticipée" },
  { value: "excused", label: "Excusé" },
];

function formatSeanceDate(iso: string): string {
  if (!iso) return "—";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return iso;
  return new Intl.DateTimeFormat("fr-FR", {
    dateStyle: "full",
    timeStyle: "short",
  }).format(d);
}

export default function TitulairePresenceDetailClient({
  initialData,
}: {
  initialData: Initial;
}) {
  const [rows, setRows] = useState<PresenceRowView[]>(() => initialData.rows);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const emptyRoster = useMemo(() => rows.length === 0, [rows.length]);

  function setStatus(id: string, status: PresenceRowView["status"]) {
    setRows((prev) => prev.map((r) => (r.id === id ? { ...r, status } : r)));
  }

  async function onSave() {
    setSaving(true);
    setMessage(null);
    setError(null);
    try {
      const payload = rows
        .filter((r) => r.id)
        .map((r) => ({
          id: r.id,
          status: r.status,
        }));
      const res = await updatePresencesForSeance(payload);
      setMessage(`${res.updated} présence(s) mise(s) à jour.`);
    } catch (e) {
      setError((e as Error).message ?? "Échec de la mise à jour des présences.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="space-y-4">
      <div className="rounded-lg border border-gray-100 bg-gray-50/80 px-3 py-2 text-sm dark:border-gray-800 dark:bg-gray-800/40">
        <p className="text-xs text-gray-500 dark:text-gray-400">Séance</p>
        <p className="font-semibold text-midnight_text dark:text-white">{initialData.seance.label}</p>
        <p className="mt-1 text-xs text-gray-600 dark:text-gray-300">{formatSeanceDate(initialData.seance.dateSeance)}</p>
        <p className="mt-1 text-xs text-gray-500">
          {initialData.seance.jour} · {initialData.seance.heureDebut} - {initialData.seance.heureFin} · Salle :{" "}
          <strong>{initialData.seance.salle || "—"}</strong>
        </p>
      </div>

      {message ? (
        <p className="rounded-md border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm text-emerald-800 dark:border-emerald-900 dark:bg-emerald-950/30 dark:text-emerald-200">
          {message}
        </p>
      ) : null}
      {error ? (
        <p className="rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700 dark:border-red-900 dark:bg-red-950/40 dark:text-red-200">
          {error}
        </p>
      ) : null}

      {emptyRoster ? (
        <p className="text-sm text-gray-600 dark:text-gray-400">
          Aucune présence enregistrée pour cette séance.
        </p>
      ) : (
        <div className="overflow-x-auto rounded-lg border border-gray-200 dark:border-gray-700">
          <table className="min-w-full divide-y divide-gray-200 text-sm dark:divide-gray-700">
            <thead className="bg-gray-50 dark:bg-gray-800/80">
              <tr>
                <th className="px-3 py-2 text-left text-xs font-semibold">Matricule</th>
                <th className="px-3 py-2 text-left text-xs font-semibold">Nom</th>
                <th className="px-3 py-2 text-left text-xs font-semibold">Email</th>
                <th className="px-3 py-2 text-left text-xs font-semibold">Matière</th>
                <th className="px-3 py-2 text-left text-xs font-semibold">Date scan</th>
                <th className="px-3 py-2 text-left text-xs font-semibold">Statut</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100 bg-white dark:divide-gray-800 dark:bg-gray-900/40">
              {rows.map((r) => (
                <tr key={r.matricule}>
                  <td className="whitespace-nowrap px-3 py-2 font-mono text-xs">{r.matricule}</td>
                  <td className="px-3 py-2">{r.studentName}</td>
                  <td className="px-3 py-2">{r.email || "—"}</td>
                  <td className="px-3 py-2">{r.matiere || "—"}</td>
                  <td className="px-3 py-2">{formatSeanceDate(r.date)}</td>
                  <td className="px-3 py-2">
                    <select
                      value={r.status}
                      onChange={(e) => setStatus(r.id, e.target.value as PresenceRowView["status"])}
                      className="w-full max-w-[12rem] rounded-md border border-gray-300 px-2 py-1 text-xs dark:border-gray-600 dark:bg-gray-800 dark:text-white"
                    >
                      {STATUS_OPTIONS.map((s) => (
                        <option key={s.value} value={s.value}>
                          {s.label}
                        </option>
                      ))}
                    </select>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <div className="flex justify-end">
        <button
          type="button"
          onClick={() => void onSave()}
          disabled={saving || emptyRoster}
          className="rounded-md bg-[#082b1c] px-4 py-2 text-sm font-semibold text-white disabled:opacity-50 dark:bg-[#5ec998] dark:text-gray-900"
        >
          {saving ? "Enregistrement..." : "Mettre à jour les présences"}
        </button>
      </div>
    </div>
  );
}
