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

export type { DescriptionBloc };

const EDIT_TAB_UNITE = "unite";
const EDIT_TAB_COURS = "cours";

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

function MatiereEditRow({
  matiere,
  uniteId,
  creditsPlafondUnite,
  creditsAutresMatieres,
  onAfterChange,
}: {
  matiere: MatiereLite;
  uniteId: string;
  creditsPlafondUnite: number;
  creditsAutresMatieres: number;
  onAfterChange: () => Promise<void>;
}) {
  const [designation, setDesignation] = useState(matiere.designation);
  const [credits, setCredits] = useState(String(matiere.credits ?? ""));
  const [code, setCode] = useState(matiere.code ?? "");
  const [description, setDescription] = useState<DescriptionBloc[]>(() => cloneDescription(matiere.description));
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [localErr, setLocalErr] = useState<string | null>(null);

  useEffect(() => {
    setDesignation(matiere.designation);
    setCredits(String(matiere.credits ?? ""));
    setCode(matiere.code ?? "");
    setDescription(cloneDescription(matiere.description));
    setLocalErr(null);
  }, [matiere._id, matiere.designation, matiere.credits, matiere.code, matiere.description]);

  const save = async () => {
    const des = designation.trim();
    const cd = code.trim();
    const c = Number.parseFloat(credits.replace(",", "."));
    if (!des) {
      setLocalErr("Désignation requise.");
      return;
    }
    if (!Number.isFinite(c) || c < 0) {
      setLocalErr("Crédits invalides.");
      return;
    }
    if (creditsMatiereDepasseUnite(creditsPlafondUnite, creditsAutresMatieres + c)) {
      setLocalErr(
        `Total matières (${creditsAutresMatieres + c} cr.) dépasse le plafond de l’unité (${creditsPlafondUnite} cr.).`
      );
      return;
    }
    const descParsed = parseDescriptionForSave(description);
    if (!descParsed.ok) {
      setLocalErr(descParsed.message);
      return;
    }
    setSaving(true);
    setLocalErr(null);
    try {
      const res = await fetch(`/api/unites/${uniteId}/matieres/${matiere._id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          designation: des,
          credits: c,
          code: cd || undefined,
          description: descParsed.value,
        }),
      });
      const j = (await res.json()) as { message?: string };
      if (!res.ok) throw new Error(j.message || "Mise à jour impossible");
      await onAfterChange();
    } catch (e) {
      setLocalErr((e as Error).message);
    } finally {
      setSaving(false);
    }
  };

  const del = async () => {
    if (!window.confirm(`Supprimer le cours « ${matiere.designation} » ?`)) return;
    setDeleting(true);
    setLocalErr(null);
    try {
      const res = await fetch(`/api/unites/${uniteId}/matieres/${matiere._id}`, { method: "DELETE" });
      const j = (await res.json()) as { message?: string };
      if (!res.ok) throw new Error(j.message || "Suppression impossible");
      await onAfterChange();
    } catch (e) {
      setLocalErr((e as Error).message);
    } finally {
      setDeleting(false);
    }
  };

  return (
    <li className="rounded-lg border border-gray-200 bg-gray-50/80 p-3 dark:border-gray-700 dark:bg-gray-800/50">
      {localErr ? (
        <p className="mb-2 text-xs text-red-600 dark:text-red-400" role="alert">
          {localErr}
        </p>
      ) : null}
      <div className="grid gap-2 sm:grid-cols-2">
        <label className="block text-xs font-medium text-gray-600 dark:text-gray-300 sm:col-span-2">
          Désignation
          <input
            className="mt-1 w-full rounded-md border border-gray-300 px-2 py-1.5 text-sm dark:border-gray-600 dark:bg-gray-900 dark:text-white"
            value={designation}
            onChange={(e) => setDesignation(e.target.value)}
          />
        </label>
        <label className="block text-xs font-medium text-gray-600 dark:text-gray-300">
          Crédits
          <input
            className="mt-1 w-full rounded-md border border-gray-300 px-2 py-1.5 text-sm dark:border-gray-600 dark:bg-gray-900 dark:text-white"
            value={credits}
            onChange={(e) => setCredits(e.target.value)}
          />
        </label>
        <label className="block text-xs font-medium text-gray-600 dark:text-gray-300">
          Code (optionnel)
          <input
            className="mt-1 w-full rounded-md border border-gray-300 px-2 py-1.5 font-mono text-sm dark:border-gray-600 dark:bg-gray-900 dark:text-white"
            value={code}
            onChange={(e) => setCode(e.target.value)}
          />
        </label>
      </div>
      <div className="mt-3 border-t border-gray-200 pt-3 dark:border-gray-700">
        <DescriptionBlocsEditor
          label="Description du cours"
          hint="Blocs optionnels (titre + texte). Laissez vide si sans description."
          items={description}
          onChange={setDescription}
        />
      </div>
      <div className="mt-2 flex flex-wrap gap-2">
        <button
          type="button"
          disabled={saving || deleting}
          onClick={() => void save()}
          className="rounded-md bg-primary px-3 py-1.5 text-xs font-semibold text-white dark:bg-primary dark:text-gray-900"
        >
          {saving ? "…" : "Enregistrer ce cours"}
        </button>
        <button
          type="button"
          disabled={saving || deleting}
          onClick={() => void del()}
          className="rounded-md border border-red-200 px-3 py-1.5 text-xs text-red-700 dark:border-red-900/40 dark:text-red-300"
        >
          {deleting ? "…" : "Supprimer"}
        </button>
      </div>
    </li>
  );
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
  const [editModalTab, setEditModalTab] = useState<string>(EDIT_TAB_UNITE);
  const [editDesignation, setEditDesignation] = useState("");
  const [editCredits, setEditCredits] = useState("");
  const [editCode, setEditCode] = useState("");
  const [editDescription, setEditDescription] = useState<DescriptionBloc[]>([]);
  const [savingEdit, setSavingEdit] = useState(false);
  const [newMatiereDesignation, setNewMatiereDesignation] = useState("");
  const [newMatiereCredits, setNewMatiereCredits] = useState("");
  const [newMatiereCode, setNewMatiereCode] = useState("");
  const [newMatiereDescription, setNewMatiereDescription] = useState<DescriptionBloc[]>([]);
  const [addingMatiere, setAddingMatiere] = useState(false);

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

  const sommeCreditsMatiereEditUe = useMemo(() => {
    if (!editUe) return 0;
    return (editUe.matieres ?? []).reduce((s, m) => s + (Number(m.credits) || 0), 0);
  }, [editUe]);

  const openEdit = (u: UniteLite) => {
    setEditUe(u);
    setEditModalTab(EDIT_TAB_UNITE);
    setEditDesignation(u.designation);
    setEditCredits(String(u.credits ?? ""));
    setEditCode(u.code);
    setEditDescription(cloneDescription(u.description));
    setNewMatiereDesignation("");
    setNewMatiereCredits("");
    setNewMatiereCode("");
    setNewMatiereDescription([]);
    setErr(null);
  };

  const closeEditModal = () => {
    setErr(null);
    setEditUe(null);
    setEditModalTab(EDIT_TAB_UNITE);
    setEditDescription([]);
    setNewMatiereDesignation("");
    setNewMatiereCredits("");
    setNewMatiereCode("");
    setNewMatiereDescription([]);
  };

  const submitAddMatiere = async () => {
    if (!editUe) return;
    const des = newMatiereDesignation.trim();
    const c = Number.parseFloat(newMatiereCredits.replace(",", "."));
    const cd = newMatiereCode.trim();
    if (!des) {
      setErr("Désignation du cours requise.");
      return;
    }
    if (!Number.isFinite(c) || c < 0) {
      setErr("Crédits du cours invalides.");
      return;
    }
    const actuel = (editUe.matieres ?? []).reduce((s, m) => s + (Number(m.credits) || 0), 0);
    if (creditsMatiereDepasseUnite(editUe.credits, actuel + c)) {
      setErr(
        `Ajout impossible : ${actuel + c} cr. (matières) pour une unité à ${editUe.credits} cr. Réduisez les crédits ou augmentez l’unité (onglet Unité).`
      );
      return;
    }
    const newDesc = parseDescriptionForSave(newMatiereDescription);
    if (!newDesc.ok) {
      setErr(newDesc.message);
      return;
    }
    setAddingMatiere(true);
    setErr(null);
    try {
      const res = await fetch(`/api/unites/${editUe._id}/matieres`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          designation: des,
          credits: c,
          code: cd || undefined,
          description: newDesc.value,
        }),
      });
      const j = (await res.json()) as { message?: string };
      if (!res.ok) throw new Error(j.message || "Création impossible");
      setNewMatiereDesignation("");
      setNewMatiereCredits("");
      setNewMatiereCode("");
      setNewMatiereDescription([]);
      await refreshUniteInModal();
    } catch (e) {
      setErr((e as Error).message);
    } finally {
      setAddingMatiere(false);
    }
  };

  const submitEditUe = async () => {
    if (!editUe) return;
    const des = editDesignation.trim();
    const cd = editCode.trim().toUpperCase();
    const c = Number.parseFloat(editCredits.replace(",", "."));
    if (!des || !cd) {
      setErr("Désignation et code requis.");
      return;
    }
    if (!Number.isFinite(c) || c < 0) {
      setErr("Crédits invalides.");
      return;
    }
    const sommeMat = (editUe.matieres ?? []).reduce((s, m) => s + (Number(m.credits) || 0), 0);
    if (creditsMatiereDepasseUnite(c, sommeMat)) {
      setErr(
        `Les matières totalisent ${sommeMat} cr. : impossible de fixer l’unité à ${c} cr. Réduisez d’abord les cours ou leurs crédits.`
      );
      return;
    }
    const descParsed = parseDescriptionForSave(editDescription);
    if (!descParsed.ok) {
      setErr(descParsed.message);
      return;
    }
    setSavingEdit(true);
    setErr(null);
    try {
      const res = await fetch(`/api/unites/${editUe._id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ designation: des, code: cd, credits: c, description: descParsed.value }),
      });
      const j = (await res.json()) as { message?: string };
      if (!res.ok) throw new Error(j.message || "Mise à jour impossible");
      closeEditModal();
      await reload();
    } catch (e) {
      setErr((e as Error).message);
    } finally {
      setSavingEdit(false);
    }
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
        <div
          className="fixed inset-0 z-[200] flex items-center justify-center bg-black/50 p-4"
          role="dialog"
          aria-modal="true"
        >
          <div
            className="flex h-[720px] w-full max-w-3xl max-h-[calc(100vh-2rem)] flex-col overflow-hidden rounded-xl border border-gray-200 bg-white shadow-xl dark:border-gray-700 dark:bg-gray-900"
          >
            <div className="shrink-0 border-b border-gray-100 px-5 py-4 dark:border-gray-800">
              <h3 className="text-lg font-semibold text-midnight_text dark:text-white">Modifier l’unité</h3>
              <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
                {editUe.code} · {editUe.designation}
              </p>

              <div className="mt-4 flex flex-wrap gap-2">
                <button
                  type="button"
                  onClick={() => {
                    setEditModalTab(EDIT_TAB_UNITE);
                    setErr(null);
                  }}
                  className={`rounded-full px-3 py-1 text-xs font-semibold ${
                    editModalTab === EDIT_TAB_UNITE
                      ? "bg-primary text-white dark:bg-primary dark:text-gray-900"
                      : "bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-300"
                  }`}
                >
                  Unité d’enseignement
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setEditModalTab(EDIT_TAB_COURS);
                    setErr(null);
                  }}
                  className={`rounded-full px-3 py-1 text-xs font-semibold ${
                    editModalTab === EDIT_TAB_COURS
                      ? "bg-primary text-white dark:bg-primary dark:text-gray-900"
                      : "bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-300"
                  }`}
                >
                  Cours (matières)
                </button>
              </div>
            </div>

            {err ? (
              <div className="shrink-0 border-b border-red-100 bg-red-50/80 px-5 py-2 dark:border-red-900/30 dark:bg-red-950/20">
                <p className="text-sm text-red-700 dark:text-red-300" role="alert">
                  {err}
                </p>
              </div>
            ) : null}

            <div className="min-h-0 flex-1 overflow-y-auto overflow-x-hidden px-5 py-4">
            {editModalTab === EDIT_TAB_UNITE ? (
              <>
                <div className="mt-4 space-y-3">
                  <label className="block text-xs font-medium text-gray-600 dark:text-gray-300">
                    Désignation
                    <input
                      className="mt-1 w-full rounded-md border border-gray-300 px-3 py-2 text-sm dark:border-gray-600 dark:bg-gray-800 dark:text-white"
                      value={editDesignation}
                      onChange={(e) => setEditDesignation(e.target.value)}
                    />
                  </label>
                  <label className="block text-xs font-medium text-gray-600 dark:text-gray-300">
                    Code
                    <input
                      className="mt-1 w-full rounded-md border border-gray-300 px-3 py-2 font-mono text-sm dark:border-gray-600 dark:bg-gray-800 dark:text-white"
                      value={editCode}
                      onChange={(e) => setEditCode(e.target.value.toUpperCase())}
                    />
                  </label>
                  <label className="block text-xs font-medium text-gray-600 dark:text-gray-300">
                    Crédits
                    <input
                      className="mt-1 w-full rounded-md border border-gray-300 px-3 py-2 text-sm dark:border-gray-600 dark:bg-gray-800 dark:text-white"
                      value={editCredits}
                      onChange={(e) => setEditCredits(e.target.value)}
                    />
                  </label>
                  <div className="border-t border-gray-100 pt-4 dark:border-gray-800">
                    <DescriptionBlocsEditor
                      label="Description de l’unité"
                      hint="Blocs structurés (titre + texte). Optionnel."
                      items={editDescription}
                      onChange={setEditDescription}
                    />
                  </div>
                </div>
                <div className="mt-5 flex justify-end gap-2">
                  <button
                    type="button"
                    disabled={savingEdit}
                    onClick={closeEditModal}
                    className="rounded-md border border-gray-300 px-4 py-2 text-sm dark:border-gray-600"
                  >
                    Fermer
                  </button>
                  <button
                    type="button"
                    disabled={savingEdit}
                    onClick={() => void submitEditUe()}
                    className="rounded-md bg-primary px-4 py-2 text-sm font-semibold text-white dark:bg-primary dark:text-gray-900"
                  >
                    {savingEdit ? "…" : "Enregistrer l’unité"}
                  </button>
                </div>
              </>
            ) : (
              <>
                <p className="mt-3 text-xs text-gray-500 dark:text-gray-400">
                  Modifiez les cours rattachés à cette unité. Chaque ligne s’enregistre indépendamment. La somme des
                  crédits des matières ne peut pas dépasser le plafond de l’unité.
                </p>
                <p
                  className={`mt-2 rounded-lg px-3 py-2 text-xs ${
                    creditsMatiereDepasseUnite(editUe.credits, sommeCreditsMatiereEditUe)
                      ? "bg-red-50 text-red-800 dark:bg-red-950/40 dark:text-red-200"
                      : "bg-gray-50 text-gray-700 dark:bg-gray-800/60 dark:text-gray-200"
                  }`}
                >
                  Plafond UE : <span className="font-semibold">{editUe.credits} cr.</span> · Matières :{" "}
                  <span className="font-semibold">{sommeCreditsMatiereEditUe} cr.</span>
                  {!creditsMatiereDepasseUnite(editUe.credits, sommeCreditsMatiereEditUe) ? (
                    <>
                      {" "}
                      · Reste :{" "}
                      <span className="font-semibold">
                        {Math.round((editUe.credits - sommeCreditsMatiereEditUe) * 1000) / 1000} cr.
                      </span>
                    </>
                  ) : (
                    <span className="font-medium"> — dépassement : corrigez les cours ou augmentez l’unité.</span>
                  )}
                </p>
                {(editUe.matieres ?? []).length === 0 ? (
                  <p className="mt-4 text-sm text-gray-500 dark:text-gray-400">Aucun cours pour l’instant.</p>
                ) : (
                  <ul className="mt-4 space-y-3">
                    {(editUe.matieres ?? []).map((m) => (
                      <MatiereEditRow
                        key={m._id}
                        matiere={m}
                        uniteId={editUe._id}
                        creditsPlafondUnite={editUe.credits}
                        creditsAutresMatieres={(editUe.matieres ?? [])
                          .filter((x) => x._id !== m._id)
                          .reduce((s, x) => s + (Number(x.credits) || 0), 0)}
                        onAfterChange={refreshUniteInModal}
                      />
                    ))}
                  </ul>
                )}

                <div className="mt-6 rounded-lg border border-dashed border-gray-200 p-3 dark:border-gray-700">
                  <p className="text-xs font-semibold text-midnight_text dark:text-white">Ajouter un cours</p>
                  <div className="mt-2 grid gap-2 sm:grid-cols-2">
                    <label className="block text-xs font-medium text-gray-600 dark:text-gray-300 sm:col-span-2">
                      Désignation
                      <input
                        className="mt-1 w-full rounded-md border border-gray-300 px-2 py-1.5 text-sm dark:border-gray-600 dark:bg-gray-800 dark:text-white"
                        value={newMatiereDesignation}
                        onChange={(e) => setNewMatiereDesignation(e.target.value)}
                        placeholder="ex. Introduction…"
                      />
                    </label>
                    <label className="block text-xs font-medium text-gray-600 dark:text-gray-300">
                      Crédits
                      <input
                        className="mt-1 w-full rounded-md border border-gray-300 px-2 py-1.5 text-sm dark:border-gray-600 dark:bg-gray-800 dark:text-white"
                        value={newMatiereCredits}
                        onChange={(e) => setNewMatiereCredits(e.target.value)}
                        placeholder="3"
                      />
                    </label>
                    <label className="block text-xs font-medium text-gray-600 dark:text-gray-300">
                      Code (optionnel)
                      <input
                        className="mt-1 w-full rounded-md border border-gray-300 px-2 py-1.5 font-mono text-sm dark:border-gray-600 dark:bg-gray-800 dark:text-white"
                        value={newMatiereCode}
                        onChange={(e) => setNewMatiereCode(e.target.value)}
                      />
                    </label>
                  </div>
                  <div className="mt-3 border-t border-gray-200 pt-3 dark:border-gray-600">
                    <DescriptionBlocsEditor
                      label="Description du nouveau cours"
                      items={newMatiereDescription}
                      onChange={setNewMatiereDescription}
                    />
                  </div>
                  <button
                    type="button"
                    disabled={addingMatiere}
                    onClick={() => void submitAddMatiere()}
                    className="mt-3 rounded-md bg-primary px-3 py-1.5 text-xs font-semibold text-white dark:bg-primary dark:text-gray-900"
                  >
                    {addingMatiere ? "…" : "Ajouter le cours"}
                  </button>
                </div>

                <div className="mt-5 flex justify-end">
                  <button
                    type="button"
                    onClick={closeEditModal}
                    className="rounded-md border border-gray-300 px-4 py-2 text-sm dark:border-gray-600"
                  >
                    Fermer
                  </button>
                </div>
              </>
            )}
            </div>
          </div>
        </div>
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
