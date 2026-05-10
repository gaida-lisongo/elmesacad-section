"use client";
import { useEffect, useMemo, useState } from "react";
import { DescriptionItem, DraftSemestre, SectionBureauRow } from "../SectionProgrammesClient";
import { DescriptionBlocsEditor, parseDescriptionForSave } from "@/components/Layout/DescriptionBlocsEditor";
import { SemestreCatalogSearch } from "@/components/secure/SemestreCatalogSearch";
import { SemestreCatalogPick } from "@/lib/semestre-search/fetchSemestreCatalogSearch";

const ProgrammeCreate = ({
    activeSection,
    activeId,
    closeModal,
    newKey,
    loadProgrammes,
}: {
    activeSection: SectionBureauRow | null;
    activeId: string | null;
    closeModal: (submitting: boolean)=>void;
    newKey: () => string;
    loadProgrammes: (sectionId: string) => Promise<void>;
}) => {
  const [step, setStep] = useState(1);
  const [designation, setDesignation] = useState("");
  const [creditsStr, setCreditsStr] = useState("");
  const [descriptionBlocs, setDescriptionBlocs] = useState<DescriptionItem[]>([]);
  const [draftSemestres, setDraftSemestres] = useState<DraftSemestre[]>([]);
  const [submitting, setSubmitting] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);
  
  const recapDescription = useMemo(() => parseDescriptionForSave(descriptionBlocs), [descriptionBlocs]);

  async function confirmCreate() {
    if (!activeId) return;
    const e1 = validateStep1();
    if (e1) {
      setFormError(e1);
      setStep(1);
      return;
    }
    const e2 = validateStep2();
    if (e2) {
      setFormError(e2);
      setStep(2);
      return;
    }
    const descParsed = parseDescriptionForSave(descriptionBlocs);
    if (!descParsed.ok) return;

    setSubmitting(true);
    setFormError(null);
    try {
      const credits = Number(creditsStr);
      const resP = await fetch(`/api/sections/${activeId}/programmes`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          designation: designation.trim(),
          credits,
          description: descParsed.value,
        }),
      });
      const jsonP = await resP.json().catch(() => ({}));
      if (!resP.ok) {
        setFormError((jsonP.message as string) || "Création du programme impossible.");
        setSubmitting(false);
        return;
      }
      const programmeId = jsonP.data?._id as string | undefined;
      if (!programmeId) {
        setFormError("Réponse serveur inattendue.");
        setSubmitting(false);
        return;
      }

      for (const s of draftSemestres) {
        if (!s.pick?.id) continue;
        const resS = await fetch(`/api/sections/${activeId}/programmes/${programmeId}/semestres`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            semestreId: s.pick.id,
          }),
        });
        if (!resS.ok) {
          const js = await resS.json().catch(() => ({}));
          setFormError((js.message as string) || "Erreur lors de l’association d’un semestre.");
          setSubmitting(false);
          return;
        }
      }

      closeModal(submitting);
      await loadProgrammes(activeId);
    } catch {
      setFormError("Erreur réseau.");
    } finally {
      setSubmitting(false);
    }
  }

  function validateStep1(): string | null {
    if (!designation.trim()) return "Indiquez la désignation du programme.";
    const c = Number(creditsStr);
    if (!Number.isFinite(c) || c < 0) return "Crédits invalides.";
    const d = parseDescriptionForSave(descriptionBlocs);
    if (!d.ok) return d.message;
    return null;
  }

  function validateStep2(): string | null {
    if (!draftSemestres.length) return "Ajoutez au moins un semestre.";
    const seen = new Set<string>();
    for (const s of draftSemestres) {
      if (!s.pick) return "Sélectionnez un semestre existant pour chaque ligne.";
      if (seen.has(s.pick.id)) {
        return `Semestre en double: « ${s.pick.designation} ».`;
      }
      seen.add(s.pick.id);
    }
    return null;
  }

  useEffect(() => {
    setStep(1);
    setFormError(null);
  }, []);
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 backdrop-blur-[2px]">
      <div className="flex max-h-[90vh] w-full max-w-2xl flex-col overflow-hidden rounded-2xl bg-white shadow-xl dark:bg-gray-900">
        <header className="border-b border-gray-200 px-6 py-4 dark:border-gray-800">
          <h2 className="text-lg font-semibold text-midnight_text dark:text-white">Nouveau programme</h2>
          <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
            Étape {step} sur 3 — {step === 1 ? "Définition" : step === 2 ? "Semestres" : "Confirmation"}
          </p>
          {activeSection ? (
            <p className="mt-2 text-sm text-gray-700 dark:text-gray-300">
              Section : <strong>{activeSection.designation}</strong>
            </p>
          ) : null}
        </header>
        <div className="min-h-0 flex-1 overflow-y-auto px-6 py-4">
          {formError ? (
            <div className="mb-4 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-800 dark:border-red-900 dark:bg-red-950/50 dark:text-red-200">
              {formError}
            </div>
          ) : null}
          {step === 1 ? (
            <div className="space-y-4">
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                Désignation
                <input
                  className="mt-1 w-full rounded-lg border border-gray-300 px-3 py-2 text-sm dark:border-gray-600 dark:bg-gray-800 dark:text-white"
                  value={designation}
                  onChange={(e) => setDesignation(e.target.value)}
                  placeholder="ex. Ingénieur civil"
                />
              </label>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                Crédits (total du programme)
                <input
                  type="number"
                  min={0}
                  className="mt-1 w-full rounded-lg border border-gray-300 px-3 py-2 text-sm dark:border-gray-600 dark:bg-gray-800 dark:text-white"
                  value={creditsStr}
                  onChange={(e) => setCreditsStr(e.target.value)}
                />
              </label>
              <DescriptionBlocsEditor
                label="Description du programme"
                hint="Ajoutez une ou plusieurs rubriques (titre + texte)."
                items={descriptionBlocs}
                onChange={setDescriptionBlocs}
              />
            </div>
          ) : null}
          {step === 2 ? (
            <div className="space-y-4">
              <div className="flex justify-between gap-2">
                <p className="text-sm text-gray-600 dark:text-gray-400">
                  Association de semestres existants uniquement. Recherchez via le <strong>slug</strong> ou la{" "}
                  <strong>désignation</strong> d’une <strong>filière</strong>, puis sélectionnez le semestre à lier.
                </p>
                <button
                  type="button"
                  onClick={() =>
                    setDraftSemestres((prev) => [
                      ...prev,
                      { key: newKey(), pick: null },
                    ])
                  }
                  className="shrink-0 rounded-md border border-gray-300 px-2 py-1 text-xs font-medium dark:border-gray-600"
                >
                  + Semestre
                </button>
              </div>
              <ul className="space-y-4">
                {draftSemestres.map((s, idx) => (
                  <li key={s.key} className="rounded-lg border border-gray-200 p-3 dark:border-gray-700">
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <span className="text-xs font-medium text-gray-500">Semestre {idx + 1}</span>
                      <div className="flex flex-wrap gap-2">
                        {idx > 0 ? (
                          <button
                            type="button"
                            className="text-xs text-gray-600 underline dark:text-gray-400"
                            onClick={() =>
                              setDraftSemestres((prev) => {
                                const next = [...prev];
                                [next[idx - 1], next[idx]] = [next[idx], next[idx - 1]];
                                return next;
                              })
                            }
                          >
                            Monter
                          </button>
                        ) : null}
                        {idx < draftSemestres.length - 1 ? (
                          <button
                            type="button"
                            className="text-xs text-gray-600 underline dark:text-gray-400"
                            onClick={() =>
                              setDraftSemestres((prev) => {
                                const next = [...prev];
                                [next[idx], next[idx + 1]] = [next[idx + 1], next[idx]];
                                return next;
                              })
                            }
                          >
                            Descendre
                          </button>
                        ) : null}
                        {draftSemestres.length > 1 ? (
                          <button
                            type="button"
                            className="text-xs text-red-600 underline dark:text-red-400"
                            onClick={() => setDraftSemestres((prev) => prev.filter((x) => x.key !== s.key))}
                          >
                            Retirer
                          </button>
                        ) : null}
                      </div>
                    </div>
                    <div className="mt-2">
                      <span className="text-xs font-medium text-gray-600 dark:text-gray-400">
                        Semestre existant depuis une filière (slug ou désignation)
                      </span>
                      <div className="mt-1">
                        <SemestreCatalogSearch
                          key={`${s.key}-${activeId ?? "no-section"}`}
                          sectionId={activeId ?? ""}
                          disabled={!activeId}
                          aria-label={`Trouver un semestre par filière pour la ligne ${idx + 1}`}
                          placeholder="Ex. genie-civil ou Génie civil…"
                          onPick={(item: SemestreCatalogPick) =>
                            setDraftSemestres((prev) =>
                              prev.map((x) =>
                                x.key === s.key
                                  ? {
                                      ...x,
                                      pick: item,
                                    }
                                  : x
                              )
                            )
                          }
                          clearOnSelect
                        />
                      </div>
                    </div>
                    {s.pick ? (
                      <div className="mt-2 rounded-md border border-gray-200 bg-gray-50 px-2.5 py-2 text-xs dark:border-gray-700 dark:bg-gray-800/60">
                        <p className="font-medium text-gray-700 dark:text-gray-200">{s.pick.designation}</p>
                        <p className="text-gray-500 dark:text-gray-400">Filière: {s.pick.filiereLabel}</p>
                        <p className="text-gray-500 dark:text-gray-400">
                          Crédits: {s.pick.credits != null ? s.pick.credits : "—"}
                        </p>
                      </div>
                    ) : (
                      <p className="mt-2 text-xs text-gray-500 dark:text-gray-400">Aucun semestre sélectionné.</p>
                    )}
                  </li>
                ))}
              </ul>
            </div>
          ) : null}
          {step === 3 ? (
            <div className="space-y-4 text-sm">
              <section>
                <h3 className="font-semibold text-midnight_text dark:text-white">Programme</h3>
                <p className="mt-1">
                  <strong>{designation.trim() || "—"}</strong> — {creditsStr} crédits
                </p>
                {recapDescription.ok && recapDescription.value.length > 0 ? (
                  <ul className="mt-2 list-inside list-disc text-gray-600 dark:text-gray-400">
                    {recapDescription.value.map((b, i) => (
                      <li key={i}>
                        {b.title}: {b.contenu.length > 80 ? `${b.contenu.slice(0, 80)}…` : b.contenu}
                      </li>
                    ))}
                  </ul>
                ) : (
                  <p className="mt-1 text-gray-500">Pas de description.</p>
                )}
              </section>
              <section>
                <h3 className="font-semibold text-midnight_text dark:text-white">Semestres ({draftSemestres.length})</h3>
                <ol className="mt-2 list-inside list-decimal space-y-1 text-gray-600 dark:text-gray-400">
                  {draftSemestres.map((s) => (
                    <li key={s.key}>
                      {s.pick?.designation || "—"}
                      {s.pick?.filiereLabel ? ` — ${s.pick.filiereLabel}` : ""}
                      {s.pick?.credits != null ? ` — ${s.pick.credits} cr.` : ""}
                    </li>
                  ))}
                </ol>
              </section>
              <section className="rounded-lg border border-gray-200 bg-gray-50 p-3 dark:border-gray-700 dark:bg-gray-800/50">
                <p className="font-medium text-midnight_text dark:text-white">Confirmation</p>
                <p className="mt-1 text-gray-600 dark:text-gray-400">
                  Le programme sera créé pour la section <strong>{activeSection?.designation}</strong> avec les semestres
                  ci-dessus.
                </p>
              </section>
            </div>
          ) : null}
        </div>
        <footer className="flex flex-wrap justify-end gap-2 border-t border-gray-200 px-6 py-4 dark:border-gray-800">
          <button
            type="button"
            onClick={() => closeModal(submitting)}
            disabled={submitting}
            className="rounded-lg border border-gray-300 px-4 py-2 text-sm dark:border-gray-600"
          >
            Annuler
          </button>
          {step > 1 ? (
            <button
              type="button"
              disabled={submitting}
              onClick={() => {
                setFormError(null);
                setStep((st) => Math.max(1, st - 1));
              }}
              className="rounded-lg border border-gray-300 px-4 py-2 text-sm dark:border-gray-600"
            >
              Retour
            </button>
          ) : null}
          {step < 3 ? (
            <button
              type="button"
              disabled={submitting}
              onClick={() => {
                setFormError(null);
                if (step === 1) {
                  const err = validateStep1();
                  if (err) {
                    setFormError(err);
                    return;
                  }
                }
                if (step === 2) {
                  const err = validateStep2();
                  if (err) {
                    setFormError(err);
                    return;
                  }
                }
                setStep((st) => st + 1);
              }}
              className="rounded-lg bg-primary px-4 py-2 text-sm font-medium text-white dark:bg-primary dark:text-gray-900"
            >
              Suivant
            </button>
          ) : (
            <button
              type="button"
              disabled={submitting}
              onClick={confirmCreate}
              className="rounded-lg bg-primary px-4 py-2 text-sm font-medium text-white dark:bg-primary dark:text-gray-900"
            >
              {submitting ? "Enregistrement…" : "Confirmer et créer"}
            </button>
          )}
        </footer>
      </div>
    </div>
  );
};

export default ProgrammeCreate;