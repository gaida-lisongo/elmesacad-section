'use client';

import { DescriptionBloc } from "@/components/Layout/DescriptionBlocsEditor";
import { useEffect, useMemo, useState } from "react";
import { DraftSemestre, FiliereRow, ProgrammeRow, UniteRow } from "../SectionProgrammesClient";
import { SemestreCatalogPick } from "@/lib/semestre-search/fetchSemestreCatalogSearch";
import { SemestreCatalogSearch } from "@/components/secure/SemestreCatalogSearch";

type EditSemestreRow = {
    _id: string;
    designation: string;
    credits?: number;
    filiere?: FiliereRow | null;
    unites?: UniteRow[];
};
const ProgrammeEdit = ({
    activeId,
    programmes,
    loadProgrammes,
    closeEditModal,
}: {
    activeId: string | null;
    programmes: ProgrammeRow[];
    loadProgrammes: (sectionId: string) => Promise<void>;
    closeEditModal: (submitting: boolean) => void;
}) => {
  const [editError, setEditError] = useState<string | null>(null);
  const [semSubmitBusy, setSemSubmitBusy] = useState(false);
  const [editTab, setEditTab] = useState<"info" | "semestres">("info");
  const [editSubmitting, setEditSubmitting] = useState(false);
  const [descriptionBlocs, setDescriptionBlocs] = useState<DescriptionBloc[]>([]);
  const [editingProgrammeId, setEditingProgrammeId] = useState<string | null>(null);
  const [editDesignation, setEditDesignation] = useState("");
  const [editCreditsStr, setEditCreditsStr] = useState("");
  const [newSemPick, setNewSemPick] = useState<SemestreCatalogPick | null>(null);

  async function submitEdit() {
    if (!activeId || !editingProgrammeId) return;
    if (!editDesignation.trim()) {
      setEditError("Indiquez la désignation du programme.");
      return;
    }
    const c = Number(editCreditsStr);
    if (!Number.isFinite(c) || c < 0) {
      setEditError("Crédits invalides.");
      return;
    }

    setEditSubmitting(true);
    setEditError(null);
    try {
      const res = await fetch(`/api/sections/${activeId}/programmes/${editingProgrammeId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          designation: editDesignation.trim(),
          credits: c,
        }),
      });
      const json = await res.json().catch(() => ({}));
      if (!res.ok) {
        setEditError((json.message as string) || "Modification impossible.");
        return;
      }
      closeEditModal(editSubmitting);
      setEditingProgrammeId(null);
      await loadProgrammes(activeId);
    } catch {
      setEditError("Erreur réseau.");
    } finally {
      setEditSubmitting(false);
    }
  }

  async function addSemestreToProgramme() {
    if (!activeId || !editingProgrammeId) return;
    if (!newSemPick) {
      setEditError("Sélectionnez un semestre via la recherche filière.");
      return;
    }
    setSemSubmitBusy(true);
    setEditError(null);
    try {
      const res = await fetch(`/api/sections/${activeId}/programmes/${editingProgrammeId}/semestres`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          semestreId: newSemPick.id,
        }),
      });
      const json = await res.json().catch(() => ({}));
      if (!res.ok) {
        setEditError((json.message as string) || "Ajout du semestre impossible.");
        return;
      }
      setNewSemPick(null);
      await loadProgrammes(activeId);
    } catch {
      setEditError("Erreur réseau.");
    } finally {
      setSemSubmitBusy(false);
    }
  }

  async function removeSemestre(semestreId: string) {
    if (!activeId || !editingProgrammeId) return;
    if (!window.confirm("Supprimer ce semestre ?")) return;
    setSemSubmitBusy(true);
    setEditError(null);
    try {
      const res = await fetch(
        `/api/sections/${activeId}/programmes/${editingProgrammeId}/semestres/${semestreId}`,
        { method: "DELETE" }
      );
      const json = await res.json().catch(() => ({}));
      if (!res.ok) {
        setEditError((json.message as string) || "Suppression du semestre impossible.");
        return;
      }
      await loadProgrammes(activeId);
    } catch {
      setEditError("Erreur réseau.");
    } finally {
      setSemSubmitBusy(false);
    }
  }

  const editingProgrammeSemestres = useMemo(() => {
    if (!editingProgrammeId) return [];
    const semestres = programmes.find((p) => p._id === editingProgrammeId)?.semestres ?? [];
    return semestres as EditSemestreRow[];
  }, [programmes, editingProgrammeId]);

  useEffect(() => {
    if (activeId && editingProgrammeId) {
      setEditDesignation(programmes.find((p) => p._id === editingProgrammeId)?.designation ?? "");
      setEditCreditsStr(programmes.find((p) => p._id === editingProgrammeId)?.credits?.toString() ?? "60");
      setDescriptionBlocs(programmes.find((p) => p._id === editingProgrammeId)?.description ?? []);
    }
  }, [activeId, editingProgrammeId, programmes]);

  useEffect(() => {
    setEditTab("info");
    setNewSemPick(null);
    setEditError(null);
    setEditingProgrammeId(activeId ?? null);
  }, []);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 backdrop-blur-[2px]">
      <div className="flex max-h-[90vh] w-full max-w-2xl flex-col overflow-hidden rounded-2xl bg-white shadow-xl dark:bg-gray-900">
        <header className="border-b border-gray-200 px-6 py-4 dark:border-gray-800">
          <h2 className="text-lg font-semibold text-midnight_text dark:text-white">Modifier le programme</h2>
          <div className="mt-3 flex gap-2">
            <button
              type="button"
              onClick={() => setEditTab("info")}
              className={`rounded-md px-2.5 py-1 text-xs font-medium ${
                editTab === "info"
                  ? "bg-primary text-white dark:bg-primary dark:text-gray-900"
                  : "border border-gray-300 dark:border-gray-600"
              }`}
            >
              Informations
            </button>
            <button
              type="button"
              onClick={() => setEditTab("semestres")}
              className={`rounded-md px-2.5 py-1 text-xs font-medium ${
                editTab === "semestres"
                  ? "bg-primary text-white dark:bg-primary dark:text-gray-900"
                  : "border border-gray-300 dark:border-gray-600"
              }`}
            >
              Semestres
            </button>
          </div>
        </header>
        <div className="min-h-0 space-y-4 overflow-y-auto px-6 py-4">
          {editError ? (
            <div className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-800 dark:border-red-900 dark:bg-red-950/50 dark:text-red-200">
              {editError}
            </div>
          ) : null}
          {editTab === "info" ? (
            <>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                Désignation
                <input
                  className="mt-1 w-full rounded-lg border border-gray-300 px-3 py-2 text-sm dark:border-gray-600 dark:bg-gray-800 dark:text-white"
                  value={editDesignation}
                  onChange={(e) => setEditDesignation(e.target.value)}
                />
              </label>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                Crédits
                <input
                  type="number"
                  min={0}
                  className="mt-1 w-full rounded-lg border border-gray-300 px-3 py-2 text-sm dark:border-gray-600 dark:bg-gray-800 dark:text-white"
                  value={editCreditsStr}
                  onChange={(e) => setEditCreditsStr(e.target.value)}
                />
              </label>
            </>
          ) : (
            <div className="space-y-4">
              <div className="rounded-xl border border-gray-200 bg-white p-4 shadow-sm dark:border-gray-700 dark:bg-gray-900/40">
                <p className="text-xs font-semibold uppercase tracking-wide text-gray-500 dark:text-gray-400">
                  Association d’un semestre existant (aucune création)
                </p>
                <p className="mt-2 text-xs text-gray-500 dark:text-gray-400">
                  Recherchez via le slug ou la désignation de filière, sélectionnez un semestre existant, puis
                  associez-le au programme.
                </p>
                <div className="mt-2">
                  <SemestreCatalogSearch
                    key={`edit-sem-search-${activeId ?? "no-section"}-${editingProgrammeId ?? "no-programme"}`}
                    sectionId={activeId ?? ""}
                    disabled={!activeId || !editingProgrammeId || semSubmitBusy}
                    aria-label="Trouver un semestre par filière pour ce programme"
                    placeholder="Ex. genie-civil ou Génie civil…"
                    onPick={(item) => setNewSemPick(item)}
                    clearOnSelect
                  />
                </div>
                {newSemPick ? (
                  <div className="mt-2 rounded-md border border-gray-200 bg-gray-50 px-2.5 py-2 text-xs dark:border-gray-700 dark:bg-gray-800/60">
                    <p className="font-medium text-gray-700 dark:text-gray-200">{newSemPick.designation}</p>
                    <p className="text-gray-500 dark:text-gray-400">
                      Filière: {newSemPick.filiereLabel} {newSemPick.filiereSlug ? `(${newSemPick.filiereSlug})` : ""}
                    </p>
                    <p className="text-gray-500 dark:text-gray-400">
                      Crédits: {newSemPick.credits != null ? newSemPick.credits : "—"}
                    </p>
                  </div>
                ) : null}
                <div className="mt-3 flex justify-end">
                  <button
                    type="button"
                    onClick={() => void addSemestreToProgramme()}
                    disabled={semSubmitBusy || !newSemPick}
                    className="rounded-md bg-primary px-3 py-1.5 text-xs font-semibold text-white shadow-sm transition-all duration-200 hover:-translate-y-0.5 hover:shadow-md disabled:opacity-60 dark:bg-primary dark:text-gray-900"
                  >
                    {semSubmitBusy ? "Association..." : "Associer ce semestre"}
                  </button>
                </div>
              </div>

              {!editingProgrammeId ? (
                <p className="text-sm text-gray-500">Veuillez sélectionner un programme</p>
              ) : editingProgrammeSemestres.length === 0 ? (
                <p className="text-sm text-gray-500">Aucun semestre associé à ce programme.</p>
              ) : (
                <ul className="space-y-3">
                  {editingProgrammeSemestres.map((s) => (
                    <li
                      key={s._id}
                      className="flex items-start justify-between gap-3 rounded-xl border border-gray-200 bg-white px-3 py-3 shadow-sm transition-all duration-200 hover:-translate-y-0.5 hover:shadow-md dark:border-gray-700 dark:bg-gray-900/40"
                    >
                      <div className="min-w-0">
                        <p className="text-sm font-semibold text-midnight_text dark:text-white">{s.designation}</p>
                        <p className="mt-0.5 text-xs text-gray-500 dark:text-gray-400">{s.credits ?? 0} cr.</p>
                        <p className="mt-2 text-xs text-gray-500 dark:text-gray-400">
                          Filière: {s?.filiere?.designation ?? "—"}
                        </p>
                      </div>
                      <button
                        type="button"
                        onClick={() => void removeSemestre(s._id)}
                        disabled={semSubmitBusy}
                        className="rounded-md border border-red-300 px-2 py-1 text-xs font-medium text-red-700 transition-all duration-200 hover:-translate-y-0.5 hover:shadow-sm dark:border-red-800 dark:text-red-300"
                      >
                        Supprimer
                      </button>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          )}
        </div>
        <footer className="flex justify-end gap-2 border-t border-gray-200 px-6 py-4 dark:border-gray-800">
          <button
            type="button"
            onClick={() => closeEditModal(editSubmitting)}
            disabled={editSubmitting}
            className="rounded-lg border border-gray-300 px-4 py-2 text-sm dark:border-gray-600"
          >
            Annuler
          </button>
          <button
            type="button"
            onClick={() => void submitEdit()}
            disabled={editSubmitting || editTab !== "info"}
            className="rounded-lg bg-primary px-4 py-2 text-sm font-medium text-white dark:bg-primary dark:text-gray-900"
          >
            {editSubmitting ? "Enregistrement…" : "Enregistrer les infos"}
          </button>
        </footer>
      </div>
    </div>
  );
};

export default ProgrammeEdit;