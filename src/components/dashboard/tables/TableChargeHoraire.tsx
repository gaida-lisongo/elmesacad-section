"use client";

import Link from "next/link";
import { useEffect, useState, useCallback } from "react";
import type { OrganisateurCeChargesHorairesPayload } from "@/lib/dashboard/types";

type UniteRow = {
  uniteId: string;
  uniteDesignation: string;
  uniteCode: string;
  credits: number;
  semestreDesignation: string;
  matieresCount: number;
};

type Props = { payload: OrganisateurCeChargesHorairesPayload };

export function TableChargeHoraire({ payload }: Props) {
  const { sectionId, programmes, sectionDesignation } = payload;

  const [activeProgrammeId, setActiveProgrammeId] = useState<string>("");
  const [unites, setUnites] = useState<UniteRow[]>([]);
  const [loading, setLoading] = useState(false);

  // Sélection du premier programme par défaut
  useEffect(() => {
    if (programmes.length > 0 && !activeProgrammeId) {
      setActiveProgrammeId(programmes[0]._id);
    }
  }, [programmes, activeProgrammeId]);

  const fetchUnites = useCallback(async (programmeId: string) => {
    if (!programmeId) return;
    setLoading(true);
    try {
      const sp = new URLSearchParams({ programmeId });
      const res = await fetch(`/api/sections/${sectionId}/programmes/unites?${sp.toString()}`);
      if (!res.ok) throw new Error("Impossible de charger les unités");
      const json = await res.json();
      setUnites(json.data || []);
    } catch (err) {
      console.error(err);
      setUnites([]);
    } finally {
      setLoading(false);
    }
  }, [activeProgrammeId]);

  // Charger les unités quand le programme change
  useEffect(() => {
    if (activeProgrammeId) {
      console.log("activeProgrammeId", activeProgrammeId);
      fetchUnites(activeProgrammeId);
    }
  }, [activeProgrammeId, fetchUnites]);

  const headers = ["Semestre", "Unité", "Code", "Crédits", "Matières", "Action"];

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
              {p.designation} {p.slug ? `(${p.slug})` : ""}
            </option>
          ))}
        </select>
      </label>

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
            ) : unites.length === 0 ? (
              <tr>
                <td colSpan={headers.length} className="px-3 py-12 text-center text-gray-500">
                  Aucune unité trouvée pour ce programme.
                </td>
              </tr>
            ) : (
              unites.map((u) => (
                <tr
                  key={u.uniteId}
                  className="border-b border-gray-100 hover:bg-gray-50/80 dark:border-gray-800 dark:hover:bg-gray-800/40"
                >
                  <td className="px-3 py-2 text-gray-700 dark:text-gray-200">{u.semestreDesignation}</td>
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