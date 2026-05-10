"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useState } from "react";
import { PageListe, PageListeCategoryCard } from "@/components/Layout/PageListe";
import {
  DescriptionBlocsEditor,
  cloneDescription,
  parseDescriptionForSave,
  type DescriptionBloc,
} from "@/components/Layout/DescriptionBlocsEditor";
import UniteMatiereWizardModal from "@/components/filiere/UniteMatiereWizardModal";
import { creditsMatiereDepasseUnite } from "@/lib/validation/creditsCoherence";
import UniteEditModal from "./_components/UniteEditModal";

export type { DescriptionBloc };

export const EDIT_TAB_UNITE = "unite";

export type MatiereLite = {
  _id: string;
  designation: string;
  credits: number;
  code?: string;
  description?: DescriptionBloc[];
};

export type UniteLite = {
  _id: string;
  designation: string;
  code: string;
  credits: number;
  description?: DescriptionBloc[];
  matieres?: MatiereLite[];
};

export type SemestreLite = {
  _id: string;
  designation: string;
  order?: number;
  credits?: number;
  unites?: UniteLite[];
};

export type FiliereStructureInitial = {
  _id: string;
  designation: string;
  slug: string;
  semestres?: SemestreLite[];
};

function findUniteInFiliere(data: FiliereStructureInitial, uniteId: string): UniteLite | null {
  for (const s of data.semestres ?? []) {
    const u = (s.unites ?? []).find((x) => String(x._id) === uniteId);
    if (u) return u;
  }
  return null;
}
type Props = {
  slug: string;
  initialData: FiliereStructureInitial;
  canManageUnites: boolean;
};

function idOf(x: { _id?: string } | undefined): string {
  if (!x?._id) return "";
  return String(x._id);
}

function uniteMatchesQuery(u: UniteLite, q: string): boolean {
  if (!q.trim()) return true;
  const s = q.trim().toLowerCase();
  if (u.designation.toLowerCase().includes(s) || u.code.toLowerCase().includes(s)) return true;
  return (u.matieres ?? []).some(
    (m) =>
      m.designation.toLowerCase().includes(s) ||
      (m.code && String(m.code).toLowerCase().includes(s))
  );
}

function pickDefaultSemestreId(semestres: SemestreLite[]): string {
  const sorted = [...semestres].sort((a, b) => (a.order ?? 0) - (b.order ?? 0));
  return sorted[0]?._id ? String(sorted[0]._id) : "";
}

export default function FiliereStructureClient({ slug, initialData, canManageUnites }: Props) {
  const [data, setData] = useState<FiliereStructureInitial>(initialData);
  const [search, setSearch] = useState("");
  const [activeSemestreId, setActiveSemestreId] = useState<string>(() =>
    pickDefaultSemestreId(initialData.semestres ?? [])
  );
  const [err, setErr] = useState<string | null>(null);
  const [wizard, setWizard] = useState<{ semestreId: string; label: string } | null>(null);
  const [editUe, setEditUe] = useState<UniteLite | null>(null);

  const filiereId = idOf(data);
  const semestres = data.semestres ?? [];
  const semestresSorted = useMemo(
    () => [...semestres].sort((a, b) => (a.order ?? 0) - (b.order ?? 0)),
    [semestres]
  );

  const activeSemestre = useMemo(
    () => semestres.find((s) => String(s._id) === activeSemestreId),
    [semestres, activeSemestreId]
  );

  useEffect(() => {
    const ids = new Set(semestres.map((s) => String(s._id)));
    if (!activeSemestreId || !ids.has(activeSemestreId)) {
      const next = pickDefaultSemestreId(semestres);
      if (next) setActiveSemestreId(next);
    }
  }, [semestres, activeSemestreId]);

  const reload = useCallback(async (): Promise<FiliereStructureInitial | undefined> => {
    setErr(null);
    try {
      const res = await fetch(`/api/filieres/slug/${encodeURIComponent(slug)}`, { cache: "no-store" });
      const j = (await res.json()) as { message?: string; data?: FiliereStructureInitial };
      if (!res.ok) throw new Error(j.message || "Rechargement impossible");
      if (j.data) {
        setData(j.data);
        return j.data;
      }
    } catch (e) {
      setErr((e as Error).message);
    }
    return undefined;
  }, [slug]);

  const refreshUniteInModal = useCallback(async () => {
    const fresh = await reload();
    if (!fresh) return;
    setEditUe((prev) => {
      if (!prev) return prev;
      const u = findUniteInFiliere(fresh, prev._id);
      return u ?? prev;
    });
  }, [reload]);

  const unitesForActiveSemestre = useMemo(() => {
    if (!activeSemestre) return [];
    return activeSemestre.unites ?? [];
  }, [activeSemestre]);

  const displayedUnites = useMemo(() => {
    const q = search.trim();
    if (!q) return unitesForActiveSemestre;
    return unitesForActiveSemestre.filter((u) => uniteMatchesQuery(u, q));
  }, [unitesForActiveSemestre, search]);


  const openEdit = (u: UniteLite) => {
    setEditUe(u);
    setErr(null);
  };

  const closeEditModal = () => {
    setErr(null);
    setEditUe(null);
  };

  const deleteUe = async (u: UniteLite) => {
    if (!window.confirm(`Supprimer l’unité « ${u.designation} » et ses matières ?`)) return;
    setErr(null);
    try {
      const res = await fetch(`/api/unites/${u._id}`, { method: "DELETE" });
      const j = (await res.json()) as { message?: string };
      if (!res.ok) throw new Error(j.message || "Suppression impossible");
      await reload();
    } catch (e) {
      setErr((e as Error).message);
    }
  };

  const deleteMatiere = async (uniteId: string, matId: string, label: string) => {
    if (!window.confirm(`Supprimer la matière « ${label} » ?`)) return;
    setErr(null);
    try {
      const res = await fetch(`/api/unites/${uniteId}/matieres/${matId}`, { method: "DELETE" });
      const j = (await res.json()) as { message?: string };
      if (!res.ok) throw new Error(j.message || "Suppression impossible");
      await reload();
    } catch (e) {
      setErr((e as Error).message);
    }
  };

  return (
    <div className="w-full min-w-0 pb-10">
      {wizard && (
        <UniteMatiereWizardModal
          open
          filiereId={filiereId}
          semestreId={wizard.semestreId}
          semestreLabel={wizard.label}
          onClose={() => setWizard(null)}
          onDone={() => void reload()}
        />
      )}

      {editUe && (
        <UniteEditModal
          editUe={editUe}
          closeEditModal={closeEditModal}
          reload={refreshUniteInModal}
          onSaveUe={async () => void await reload()}
        />
      )}

      <PageListe
        heading={
          <div>
            <nav className="mb-3">
              <Link
                href="/dashboard"
                className="inline-flex items-center gap-1 text-sm font-medium text-primary hover:underline dark:text-primary"
              >
                ← Tableau de bord
              </Link>
            </nav>
            <p className="text-xs font-medium uppercase tracking-wide text-gray-500 dark:text-gray-400">Filière</p>
            <h1 className="mt-1 text-2xl font-bold text-midnight_text dark:text-white">{data.designation}</h1>
            <p className="mt-1 font-mono text-xs text-gray-500 dark:text-gray-400">{data.slug}</p>
            {canManageUnites ? (
              <p className="mt-2 text-xs text-primary dark:text-primary">
                Habilitation SA : création et édition des unités sur le semestre sélectionné.
              </p>
            ) : null}
          </div>
        }
        sidebar={
          <>
            <PageListeCategoryCard title="Recherche">
              <label className="block text-xs font-medium text-gray-600 dark:text-gray-400">
                Filtrer les UE du semestre actif
                <input
                  type="search"
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  placeholder="Unité, code UE ou matière…"
                  className="mt-1 w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm text-midnight_text shadow-sm placeholder:text-gray-400 focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary dark:border-gray-600 dark:bg-gray-900 dark:text-white dark:placeholder:text-gray-500 dark:focus:border-primary dark:focus:ring-primary"
                  autoComplete="off"
                />
              </label>
            </PageListeCategoryCard>

            <PageListeCategoryCard
              title="Semestre actif"
              meta={
                activeSemestre ? (
                  <span>
                    Ordre {activeSemestre.order ?? "—"}
                    {activeSemestre.credits != null && Number.isFinite(activeSemestre.credits)
                      ? ` · ${activeSemestre.credits} crédits (semestre)`
                      : ""}{" "}
                    · {unitesForActiveSemestre.length} unité(s)
                  </span>
                ) : (
                  <span>Aucun semestre</span>
                )
              }
            >
              {activeSemestre ? (
                <p className="text-sm font-medium text-midnight_text dark:text-white">{activeSemestre.designation}</p>
              ) : (
                <p className="text-sm text-gray-500 dark:text-gray-400">Ajoutez un semestre à cette filière.</p>
              )}
            </PageListeCategoryCard>

            <PageListeCategoryCard title="Semestres" meta={<span>Choisir le semestre à afficher</span>}>
              {semestresSorted.length === 0 ? (
                <p className="text-sm text-gray-500 dark:text-gray-400">Aucun semestre.</p>
              ) : (
                <ul className="space-y-1">
                  {semestresSorted.map((sem) => {
                    const isActive = String(sem._id) === activeSemestreId;
                    const count = sem.unites?.length ?? 0;
                    return (
                      <li key={sem._id}>
                        <button
                          type="button"
                          onClick={() => setActiveSemestreId(String(sem._id))}
                          className={`w-full rounded-lg border px-3 py-2 text-left text-sm transition ${
                            isActive
                              ? "border-primary bg-primary/10 font-semibold text-primary dark:border-primary dark:bg-primary/15 dark:text-primary"
                              : "border-gray-200 bg-white text-midnight_text hover:border-gray-300 dark:border-gray-700 dark:bg-gray-900 dark:text-white dark:hover:border-gray-600"
                          }`}
                        >
                          <span className="block">{sem.designation}</span>
                          <span className="mt-0.5 block text-xs font-normal text-gray-500 dark:text-gray-400">
                            Ordre {sem.order ?? "—"} · {count} UE
                          </span>
                        </button>
                      </li>
                    );
                  })}
                </ul>
              )}
            </PageListeCategoryCard>
          </>
        }
      >
        {err && !editUe && (
          <p className="text-sm text-red-600 dark:text-red-400" role="alert">
            {err}
          </p>
        )}

        {canManageUnites && activeSemestre && (
          <div className="mb-2 flex flex-wrap gap-2">
            <button
              type="button"
              onClick={() =>
                setWizard({
                  semestreId: activeSemestre._id,
                  label: `${data.designation} — ${activeSemestre.designation}`,
                })
              }
              className="rounded-md bg-primary px-4 py-2 text-sm font-semibold text-white dark:bg-primary dark:text-gray-900"
            >
              + Unité & matières
            </button>
          </div>
        )}

        {!activeSemestre ? (
          <p className="rounded-lg border border-dashed border-gray-200 px-4 py-12 text-center text-sm text-gray-500 dark:border-gray-700 dark:text-gray-400">
            Aucun semestre pour cette filière.
          </p>
        ) : displayedUnites.length === 0 ? (
          <p className="rounded-lg border border-dashed border-gray-200 px-4 py-12 text-center text-sm text-gray-500 dark:border-gray-700 dark:text-gray-400">
            {search.trim()
              ? "Aucune unité ne correspond à cette recherche pour ce semestre."
              : "Aucune unité d’enseignement pour ce semestre."}
          </p>
        ) : (
          <div className="grid grid-cols-1 gap-7 md:grid-cols-2">
            {displayedUnites.map((u) => (
              <article
                key={u._id}
                className="group flex h-full flex-col rounded-xl border border-gray-200 bg-white p-5 shadow-sm transition duration-300 hover:border-primary/40 hover:shadow-md dark:border-gray-800 dark:bg-gray-900 dark:hover:border-primary/50"
              >
                <div className="flex flex-1 flex-col gap-3">
                  <div>
                    <p className="text-xs font-medium uppercase tracking-wide text-gray-400 dark:text-gray-500">
                      {u.code}
                    </p>
                    <h2 className="mt-1 text-[22px] font-medium leading-tight text-midnight_text group-hover:text-primary dark:text-white dark:group-hover:text-primary">
                      {u.designation}
                    </h2>
                    <p className="mt-2 font-mono text-sm text-gray-600 dark:text-gray-400">{u.credits} crédits ECTS</p>
                  </div>
                  {(u.matieres ?? []).length > 0 ? (
                    <p className="text-sm text-gray-600 dark:text-gray-300">
                      {(u.matieres ?? []).length} matière{(u.matieres ?? []).length > 1 ? "s" : ""}
                    </p>
                  ) : (
                    <p className="text-sm text-gray-400 dark:text-gray-500">Aucune matière liée</p>
                  )}
                  {(u.matieres ?? []).length > 0 && (
                    <details className="mt-auto text-sm">
                      <summary className="cursor-pointer text-sm font-medium text-primary dark:text-primary">
                        Détail des matières
                      </summary>
                      <ul className="mt-2 space-y-2 border-l-2 border-gray-200 pl-3 dark:border-gray-600">
                        {(u.matieres ?? []).map((m) => (
                          <li key={m._id} className="flex flex-wrap items-center justify-between gap-2 text-xs text-gray-700 dark:text-gray-200">
                            <span>
                              {m.designation}
                              <span className="text-gray-500">
                                {" "}
                                ({m.credits} cr.{m.code ? ` · ${m.code}` : ""})
                              </span>
                            </span>
                            {canManageUnites && (
                              <button
                                type="button"
                                onClick={() => void deleteMatiere(u._id, m._id, m.designation)}
                                className="text-red-600 hover:underline dark:text-red-400"
                              >
                                Supprimer
                              </button>
                            )}
                          </li>
                        ))}
                      </ul>
                    </details>
                  )}
                  {canManageUnites && (
                    <div className="mt-3 flex flex-wrap gap-2 border-t border-gray-100 pt-3 dark:border-gray-800">
                      <button
                        type="button"
                        onClick={() => openEdit(u)}
                        className="rounded-md border border-gray-300 px-3 py-1.5 text-xs font-medium dark:border-gray-600"
                      >
                        Modifier
                      </button>
                      <button
                        type="button"
                        onClick={() => void deleteUe(u)}
                        className="rounded-md border border-red-200 px-3 py-1.5 text-xs text-red-700 dark:border-red-900/40 dark:text-red-300"
                      >
                        Supprimer
                      </button>
                    </div>
                  )}
                </div>
              </article>
            ))}
          </div>
        )}
      </PageListe>
    </div>
  );
}
