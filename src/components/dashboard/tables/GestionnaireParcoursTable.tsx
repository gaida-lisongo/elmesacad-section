"use client";

import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import { ActiveAnneeIndicator } from "@/components/dashboard/ActiveAnneeIndicator";

type ApiListResponse = {
  message?: string;
  scope?: { sectionDesignation?: string };
  programmes?: Array<{ id?: string; designation?: string; code?: string; slug?: string }>;
  annee?: { slug?: string; debut?: string; fin?: string };
};

export function GestionnaireParcoursTable({
  currentAnneeId,
  currentAnneeLabel,
  annees,
}: {
  currentAnneeId: string;
  currentAnneeLabel: string;
  annees?: { id: string; designation: string; slug: string; debut: number; fin: number }[];
}) {
  const [selectedAnneeId, setSelectedAnneeId] = useState(currentAnneeId.trim());
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const [scopeLabel, setScopeLabel] = useState("");
  const [anneeSlug, setAnneeSlug] = useState("");
  const [programmes, setProgrammes] = useState<Array<{ id: string; designation: string; code: string; slug: string }>>([]);

  useEffect(() => {
    setSelectedAnneeId(currentAnneeId.trim());
  }, [currentAnneeId]);

  const selectedAnnee = annees?.find((annee) => annee.id === selectedAnneeId);
  const selectedAnneeLabel = selectedAnnee ? `${selectedAnnee.debut} - ${selectedAnnee.fin}` : currentAnneeLabel;

  const resolveWorkingAnneeId = useCallback(() => selectedAnneeId.trim(), [selectedAnneeId]);

  const load = useCallback(async () => {
    const workingAnneeId = resolveWorkingAnneeId();
    if (!workingAnneeId) {
      setProgrammes([]);
      return;
    }
    setErr(null);
    setLoading(true);
    try {
      const sp = new URLSearchParams({ anneeId: workingAnneeId });
      const res = await fetch(`/api/dashboard/gestionnaire/parcours?${sp.toString()}`);
      const payload = (await res.json()) as ApiListResponse;
      if (!res.ok) {
        throw new Error(payload.message || "Chargement des parcours impossible");
      }
      setScopeLabel(String(payload.scope?.sectionDesignation ?? ""));
      setAnneeSlug(String(payload.annee?.slug ?? ""));
      const nextProgrammes = (payload.programmes ?? []).map((p) => ({
        id: String(p.id ?? ""),
        designation: String(p.designation ?? "Programme"),
        code: String(p.code ?? ""),
        slug: String(p.slug ?? ""),
      }));
      setProgrammes(nextProgrammes.filter((p) => p.id));
    } catch (error) {
      setProgrammes([]);
      setErr((error as Error).message);
    } finally {
      setLoading(false);
    }
  }, [resolveWorkingAnneeId]);

  useEffect(() => {
    void load();
  }, [load]);

  return (
    <div className="space-y-3">
      <p className="text-xs text-gray-500 dark:text-gray-400">
        Section : <strong>{scopeLabel || "—"}</strong> · Année de travail : <strong>{selectedAnneeLabel || "—"}</strong>
      </p>
      <ActiveAnneeIndicator label={selectedAnneeLabel || "—"} />

      {annees && annees.length > 0 ? (
        <div className="flex flex-wrap gap-2">
          {annees.map((annee) => {
            const label = `${annee.debut} - ${annee.fin}`;
            const isActive = annee.id === selectedAnneeId;
            return (
              <button
                key={annee.id}
                type="button"
                onClick={() => setSelectedAnneeId(annee.id)}
                className={`rounded-full border px-3 py-1 text-xs transition focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                  isActive
                    ? "border-blue-600 bg-blue-600 text-white shadow-sm"
                    : "border-gray-300 bg-white text-gray-700 hover:border-blue-500 hover:text-blue-700 dark:border-gray-700 dark:bg-gray-900 dark:text-gray-200"
                }`}
              >
                {label}
              </button>
            );
          })}
        </div>
      ) : null}

      {err && (
        <p className="rounded border border-rose-200 bg-rose-50 px-3 py-2 text-xs text-rose-700 dark:border-rose-900 dark:bg-rose-950/30 dark:text-rose-200">
          {err}
        </p>
      )}
      {loading ? (
        <p className="text-sm text-gray-500">Chargement des programmes...</p>
      ) : programmes.length === 0 ? (
        <p className="text-sm text-gray-500">Aucun programme disponible pour votre section.</p>
      ) : !anneeSlug ? (
        <p className="text-sm text-rose-600">Année introuvable pour générer les liens parcours.</p>
      ) : (
        <div className="grid gap-3 md:grid-cols-2">
          {programmes.map((programme) => (
            <Link
              key={programme.id}
              href={`/section/p/${encodeURIComponent(programme.slug)}/${encodeURIComponent(anneeSlug)}`}
              className="rounded-xl border border-gray-200 bg-white p-4 shadow-sm transition hover:-translate-y-0.5 hover:shadow-md dark:border-gray-700 dark:bg-gray-900"
            >
              <p className="text-sm font-semibold text-midnight_text dark:text-white">{programme.designation}</p>
              <p className="mt-1 text-xs text-gray-500">{programme.code || programme.slug}</p>
              <p className="mt-2 text-xs text-blue-700 dark:text-blue-300">Ouvrir la gestion des parcours</p>
            </Link>
          ))}
        </div>
      )}
      <p className="text-xs text-gray-500 dark:text-gray-400">
        Sélectionnez un programme pour ouvrir la page dédiée (`/section/p/[programme.slug]/[annee.slug]`).
      </p>
    </div>
  );
}
