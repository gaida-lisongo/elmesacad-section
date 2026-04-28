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
    <div className="space-y-4">
      <div className="rounded-lg border border-gray-100 bg-gray-50/80 px-3 py-2 text-sm dark:border-gray-800 dark:bg-gray-800/50">
        <span className="text-xs font-medium text-gray-500 dark:text-gray-400">Section d’attache</span>
        <p className="font-semibold text-midnight_text dark:text-white">{sectionDesignation}</p>
      </div>

      <label className="block text-xs font-medium text-gray-600 dark:text-gray-400">
        Programme
        <select
          className="mt-1 block w-full max-w-md rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm dark:border-gray-600 dark:bg-gray-800 dark:text-white"
          value={activeProgrammeId}
          onChange={(e) => setActiveProgrammeId(e.target.value)}
        >
          {programmes.map((p) => (
            <option key={p._id} value={p._id}>
              {p.designation} ({p.credits} crédits)
            </option>
          ))}
        </select>
      </label>

      {semestreTabs.length > 0 ? (
        <div className="space-y-2">
          <p className="text-xs font-medium text-gray-600 dark:text-gray-400">Semestre</p>
          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              onClick={() => setActiveSemestreId("all")}
              className={`rounded-full border px-3 py-1 text-xs transition ${
                activeSemestreId === "all"
                  ? "border-[#082b1c] bg-[#082b1c] text-white dark:border-[#5ec998] dark:bg-[#5ec998] dark:text-gray-900"
                  : "border-gray-300 bg-white text-gray-700 hover:bg-gray-50 dark:border-gray-600 dark:bg-gray-800 dark:text-gray-200 dark:hover:bg-gray-700"
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
                  className={`rounded-full border px-3 py-1 text-xs transition ${
                    isActive
                      ? "border-[#082b1c] bg-[#082b1c] text-white dark:border-[#5ec998] dark:bg-[#5ec998] dark:text-gray-900"
                      : "border-gray-300 bg-white text-gray-700 hover:bg-gray-50 dark:border-gray-600 dark:bg-gray-800 dark:text-gray-200 dark:hover:bg-gray-700"
                  }`}
                >
                  {s.designation ?? "Semestre"}
                </button>
              );
            })}
          </div>
        </div>
      ) : null}

      <div className="overflow-x-auto">
        <table className="min-w-full text-left text-sm">
          <thead>
            <tr className="border-b border-gray-200 dark:border-gray-700">
              {headers.map((h) => (
                <th key={h} className="px-3 py-2 text-xs uppercase tracking-wide text-gray-500">
                  {h}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr>
                <td colSpan={headers.length} className="px-3 py-12 text-center text-gray-500">
                  Chargement des unités d’enseignement...
                </td>
              </tr>
            ) : displayedUnites.length === 0 ? (
              <tr>
                <td colSpan={headers.length} className="px-3 py-12 text-center text-gray-500">
                  Aucune unité trouvée pour ce filtre.
                </td>
              </tr>
            ) : (
              displayedUnites.map((u) => (
                <tr
                  key={u.uniteId}
                  className="border-b border-gray-100 hover:bg-gray-50/80 dark:border-gray-800 dark:hover:bg-gray-800/40"
                >
                  <td className="px-3 py-2 font-medium text-midnight_text dark:text-white">
                    {u.uniteDesignation}
                  </td>
                  <td className="px-3 py-2 font-mono text-xs text-gray-600 dark:text-gray-400">
                    {u.uniteCode}
                  </td>
                  <td className="px-3 py-2 text-center tabular-nums font-medium">{u.credits}</td>
                  <td className="px-3 py-2 text-center tabular-nums font-medium">{u.matieresCount}</td>
                  <td className="px-3 py-2">
                    <Link
                      href={`/charge-matiere/${u.uniteId}`}
                      className="font-medium text-[#082b1c] underline dark:text-[#5ec998]"
                    >
                      Gérer
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