"use client";

import Link from "next/link";
import { useEffect, useState, useCallback } from "react";
import type { OrganisateurCeChargesHorairesPayload } from "@/lib/dashboard/types";

type UniteRow = {
  uniteId: string;
  semestreId: string;
  uniteDesignation: string;
  uniteCode: string;
  credits: number;
  semestreDesignation: string;
  matieresCount: number;
};

type ProgrammeWithSemestres = {
  _id: string;
  semestres?: Array<{
    _id: string;
    designation?: string;
    unites?: Array<{
      _id: string;
      designation?: string;
      code?: string;
      credits?: number;
      matieres?: Array<unknown>;
    }>;
  }>;
};

type Props = { payload: OrganisateurCeChargesHorairesPayload };

export function TableChargeHoraire({ payload }: Props) {
  const { sectionId, programmes, sectionDesignation } = payload;

  const [activeProgrammeId, setActiveProgrammeId] = useState<string>("");
  const [activeSemestreId, setActiveSemestreId] = useState<string>("all");
  const [unites, setUnites] = useState<UniteRow[]>([]);
  const [programmesHydrated, setProgrammesHydrated] = useState<ProgrammeWithSemestres[]>([]);
  const [loading, setLoading] = useState(false);

  // Sélection du premier programme par défaut
  useEffect(() => {
    if (programmes.length > 0 && !activeProgrammeId) {
      setActiveProgrammeId(programmes[0]._id);
    }
  }, [programmes, activeProgrammeId]);

  const hydrateProgrammes = useCallback(async () => {
    if (!sectionId) return;
    setLoading(true);
    try {
      const res = await fetch(`/api/sections/${sectionId}/programmes`);
      if (!res.ok) throw new Error("Impossible de charger les programmes");
      const json = await res.json();
      const data = (json.data || []) as ProgrammeWithSemestres[];
      setProgrammesHydrated(data);
    } catch {
      setProgrammesHydrated([]);
    } finally {
      setLoading(false);
    }
  }, [sectionId]);

  useEffect(() => {
    hydrateProgrammes();
  }, [hydrateProgrammes]);

  useEffect(() => {
    if (!activeProgrammeId) {
      setUnites([]);
      return;
    }

    const active = programmesHydrated.find((p) => p._id === activeProgrammeId);
    if (!active?.semestres?.length) {
      setUnites([]);
      return;
    }

    // flatMap des unités depuis les semestres du programme actif.
    const flatUnites = active.semestres.flatMap((semestre) =>
      (semestre.unites ?? []).map((u) => ({
        uniteId: String(u._id),
        semestreId: String(semestre._id),
        uniteDesignation: u.designation ?? "",
        uniteCode: u.code ?? "",
        credits: Number(u.credits ?? 0),
        semestreDesignation: semestre.designation ?? "",
        matieresCount: Array.isArray(u.matieres) ? u.matieres.length : 0,
      }))
    );

    setUnites(flatUnites);
  }, [activeProgrammeId, programmesHydrated]);

  const activeProgramme = programmesHydrated.find((p) => p._id === activeProgrammeId) ?? null;
  const semestreTabs = activeProgramme?.semestres ?? [];

  useEffect(() => {
    if (activeSemestreId === "all") return;
    const exists = semestreTabs.some((s) => String(s._id) === activeSemestreId);
    if (!exists) setActiveSemestreId("all");
  }, [activeSemestreId, semestreTabs]);

  const displayedUnites =
    activeSemestreId === "all" ? unites : unites.filter((u) => u.semestreId === activeSemestreId);

  const headers = ["Unité", "Code", "Crédits", "Matières", "Action"];

  return (
    <div className="space-y-6 rounded-xl border border-gray-100 bg-white p-5 shadow-md shadow-gray-100/50 dark:border-gray-800 dark:bg-gray-900 dark:shadow-none">
      {/* Section d'attache */}
      <div className="rounded-xl border border-gray-100 bg-gray-50/50 px-4 py-3 text-sm dark:border-gray-800 dark:bg-gray-800/30">
        <span className="text-xs font-semibold tracking-wider text-gray-400 uppercase dark:text-gray-500">
          Section d’attache
        </span>
        <p className="mt-0.5 text-base font-bold text-midnight_text dark:text-white">
          {sectionDesignation}
        </p>
      </div>

      {/* Programmes sous forme de Tabulations */}
      <div className="space-y-2">
        <span className="text-xs font-semibold tracking-wider text-gray-500 uppercase dark:text-gray-400">
          Programmes
        </span>
        <div className="flex border-b border-gray-100 dark:border-gray-800 overflow-x-auto scrollbar-none">
          <div className="flex gap-2 pb-px">
            {programmes.map((p) => {
              const isActive = p._id === activeProgrammeId;
              return (
                <button
                  key={p._id}
                  type="button"
                  onClick={() => setActiveProgrammeId(p._id)}
                  className={`whitespace-nowrap border-b-2 px-4 py-2.5 text-sm font-medium transition-all duration-200 ${
                    isActive
                      ? "border-primary text-primary dark:border-primary"
                      : "border-transparent text-gray-500 hover:border-gray-300 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200"
                  }`}
                >
                  {p.designation}
                  <span className={`ml-2 rounded-full px-1.5 py-0.5 text-xs font-normal ${
                    isActive 
                      ? "bg-primary/10 text-primary" 
                      : "bg-gray-100 text-gray-500 dark:bg-gray-800 dark:text-gray-400"
                  }`}>
                    {p.credits} Crs
                  </span>
                </button>
              );
            })}
          </div>
        </div>
      </div>

      {/* Semestres */}
      {semestreTabs.length > 0 ? (
        <div className="space-y-2">
          <span className="text-xs font-semibold tracking-wider text-gray-500 uppercase dark:text-gray-400">
            Semestres
          </span>
          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              onClick={() => setActiveSemestreId("all")}
              className={`rounded-xl border px-4 py-1.5 text-xs font-medium transition-all duration-200 ${
                activeSemestreId === "all"
                  ? "border-primary bg-primary text-white shadow-sm shadow-primary/20"
                  : "border-gray-200 bg-white text-gray-600 hover:bg-gray-50 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-300 dark:hover:bg-gray-700"
              }`}
            >
              Tous
            </button>
            {semestreTabs.map((s) => {
              const sid = String(s._id);
              const isActive = activeSemestreId === sid;
              return (
                <button
                  key={sid}
                  type="button"
                  onClick={() => setActiveSemestreId(sid)}
                  className={`rounded-xl border px-4 py-1.5 text-xs font-medium transition-all duration-200 ${
                    isActive
                      ? "border-primary bg-primary text-white shadow-sm shadow-primary/20"
                      : "border-gray-200 bg-white text-gray-600 hover:bg-gray-50 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-300 dark:hover:bg-gray-700"
                  }`}
                >
                  {s.designation ?? "Semestre"}
                </button>
              );
            })}
          </div>
        </div>
      ) : null}

      {/* Table des Matières */}
      <div className="overflow-x-auto rounded-xl border border-gray-100 dark:border-gray-800">
        <table className="min-w-full text-left text-sm">
          <thead>
            <tr className="border-b border-gray-100 bg-gray-50/70 dark:border-gray-800 dark:bg-gray-800/20">
              {headers.map((h) => (
                <th 
                  key={h} 
                  className={`px-4 py-3 text-xs font-bold uppercase tracking-wider text-gray-400 dark:text-gray-500 ${
                    h === "Crédits" || h === "Matières" ? "text-center" : h === "Action" ? "text-right" : ""
                  }`}
                >
                  {h}
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100 dark:divide-gray-800">
            {loading ? (
              <tr>
                <td colSpan={headers.length} className="px-4 py-12 text-center text-gray-400 dark:text-gray-500">
                  <div className="flex flex-col items-center justify-center gap-2">
                    <svg className="h-5 w-5 animate-spin text-primary" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                    </svg>
                    <span className="text-xs">Chargement des unités d’enseignement...</span>
                  </div>
                </td>
              </tr>
            ) : displayedUnites.length === 0 ? (
              <tr>
                <td colSpan={headers.length} className="px-4 py-12 text-center text-gray-400 dark:text-gray-500">
                  Aucune unité trouvée pour ce filtre.
                </td>
              </tr>
            ) : (
              displayedUnites.map((u) => (
                <tr
                  key={u.uniteId}
                  className="group hover:bg-gray-50/50 dark:hover:bg-gray-800/20 transition-colors duration-150"
                >
                  <td className="px-4 py-3.5 font-semibold text-midnight_text dark:text-white">
                    {u.uniteDesignation}
                  </td>
                  <td className="px-4 py-3.5 font-mono text-xs text-gray-500 dark:text-gray-400">
                    <span className="rounded bg-gray-100 px-1.5 py-0.5 dark:bg-gray-800">
                      {u.uniteCode}
                    </span>
                  </td>
                  <td className="px-4 py-3.5 text-center tabular-nums font-semibold text-gray-750 dark:text-gray-200">
                    {u.credits}
                  </td>
                  <td className="px-4 py-3.5 text-center tabular-nums font-semibold text-gray-750 dark:text-gray-200">
                    {u.matieresCount}
                  </td>
                  <td className="px-4 py-3.5 text-right">
                    <Link
                      href={`/charge-matiere/${activeProgrammeId}_${u.uniteId}`}
                      title="Gérer la charge"
                      className="inline-flex h-8 w-8 items-center justify-center rounded-lg border border-gray-200 bg-white text-gray-500 shadow-sm transition-all duration-200 hover:border-primary hover:bg-primary/5 hover:text-primary dark:border-gray-700 dark:bg-gray-800 dark:text-gray-400 dark:hover:border-primary dark:hover:bg-primary/10 dark:hover:text-primary active:scale-95"
                    >
                      {/* Icône SVG Paramètres / Configuration */}
                      <svg
                        className="h-4 w-4"
                        fill="none"
                        viewBox="0 0 24 24"
                        stroke="currentColor"
                        strokeWidth="2"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z"
                        />
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"
                        />
                      </svg>
                    </Link>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}