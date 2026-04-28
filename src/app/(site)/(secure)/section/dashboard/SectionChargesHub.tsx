"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useState } from "react";
import { getSectionChargeStructureAction } from "@/actions/chargesHorairesTitulaire";

type MatiereRow = { _id: string; designation: string; credits: number; code?: string };
type UniteRow = { _id: string; designation: string; code: string; credits: number; matieres?: MatiereRow[] };
type SemestreRow = { _id: string; designation: string; order?: number; unites?: UniteRow[] };
type ProgrammeRow = {
  _id: string;
  designation: string;
  slug: string;
  credits: number;
  semestres?: SemestreRow[];
};

export function SectionChargesHub({ sectionId }: { sectionId: string }) {
  const [programmes, setProgrammes] = useState<ProgrammeRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState<string | null>(null);
  const [progFilter, setProgFilter] = useState<string>("all");

  const load = useCallback(async () => {
    setLoading(true);
    setErr(null);
    try {
      const r = await getSectionChargeStructureAction(sectionId);
      if (!r.ok) {
        setErr(r.message);
        setProgrammes([]);
        return;
      }
      setProgrammes((r.data || []) as ProgrammeRow[]);
    } catch {
      setErr("Erreur réseau");
      setProgrammes([]);
    } finally {
      setLoading(false);
    }
  }, [sectionId]);

  useEffect(() => {
    load();
  }, [load]);

  const filteredProgrammes = useMemo(() => {
    if (progFilter === "all") return programmes;
    return programmes.filter((p) => p._id === progFilter);
  }, [programmes, progFilter]);

  if (loading) {
    return <p className="text-sm text-gray-500">Chargement des programmes et unités…</p>;
  }
  if (err) {
    return <p className="text-sm text-red-600 dark:text-red-400">{err}</p>;
  }
  if (!programmes.length) {
    return (
      <p className="text-sm text-gray-500">
        Aucun programme pour cette section. Créez des programmes depuis « Programmes » pour gérer les charges par unité.
      </p>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-end gap-3">
        <label className="block text-xs font-medium text-gray-600 dark:text-gray-400">
          Filtrer par programme
          <select
            className="mt-1 block w-full min-w-[200px] rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm dark:border-gray-600 dark:bg-gray-800 dark:text-white"
            value={progFilter}
            onChange={(e) => setProgFilter(e.target.value)}
          >
            <option value="all">Tous les programmes</option>
            {programmes.map((p) => (
              <option key={p._id} value={p._id}>
                {p.designation}
              </option>
            ))}
          </select>
        </label>
        <Link
          href="/section/programmes"
          className="text-xs font-medium text-[#082b1c] underline dark:text-[#5ec998]"
        >
          Gérer les programmes
        </Link>
      </div>

      <div className="overflow-x-auto rounded-lg border border-gray-200 dark:border-gray-700">
        <table className="min-w-full divide-y divide-gray-200 text-sm dark:divide-gray-700">
          <thead className="bg-gray-50 dark:bg-gray-800/80">
            <tr>
              <th className="px-3 py-2 text-left text-xs font-semibold text-gray-600 dark:text-gray-300">Programme</th>
              <th className="px-3 py-2 text-left text-xs font-semibold text-gray-600 dark:text-gray-300">Semestre</th>
              <th className="px-3 py-2 text-left text-xs font-semibold text-gray-600 dark:text-gray-300">Unité</th>
              <th className="px-3 py-2 text-left text-xs font-semibold text-gray-600 dark:text-gray-300">Code UE</th>
              <th className="px-3 py-2 text-right text-xs font-semibold text-gray-600 dark:text-gray-300">Action</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100 bg-white dark:divide-gray-800 dark:bg-gray-900/40">
            {filteredProgrammes.flatMap((p) =>
              (p.semestres ?? []).flatMap((s) =>
                (s.unites ?? []).map((u) => (
                  <tr key={`${p._id}-${s._id}-${u._id}`}>
                    <td className="px-3 py-2 text-midnight_text dark:text-white">{p.designation}</td>
                    <td className="px-3 py-2 text-gray-600 dark:text-gray-400">{s.designation}</td>
                    <td className="px-3 py-2 text-midnight_text dark:text-white">{u.designation}</td>
                    <td className="px-3 py-2 font-mono text-xs text-gray-600 dark:text-gray-400">{u.code}</td>
                    <td className="px-3 py-2 text-right">
                      <Link
                        href={`/charge-matiere/${encodeURIComponent(u._id)}`}
                        className="font-medium text-[#082b1c] underline dark:text-[#5ec998]"
                      >
                        Charges
                      </Link>
                    </td>
                  </tr>
                ))
              )
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
