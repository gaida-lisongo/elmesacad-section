"use client";

import { useCallback, useEffect, useState, useTransition } from "react";
import { Icon } from "@iconify/react";
import type { DescriptionSectionInput } from "@/actions/organisateurSujetResources";
import type { SessionMatiereInput } from "@/actions/gestionnaireSessionResources";
import {
  createGestionnaireSessionResourceAction,
  getGestionnaireSessionResourceAction,
  updateGestionnaireSessionResourceAction,
} from "@/actions/gestionnaireSessionResources";
import ResourceMultiStepFormShell, {
  type ResourceStepMeta,
} from "@/components/secure/etudiant-resources/ResourceMultiStepFormShell";
import { SujetResourceDescriptionEditor } from "../recherche/ressources-sujets/SujetResourceDescriptionEditor";

type ProgrammeOption = { id: string; slug: string; designation: string; credits: number };

type FlatMatiere = {
  id: string;
  reference: string;
  code?: string;
  designation: string;
  credits: number;
};

export type ChefSectionDefaults = {
  name: string;
  telephone: string;
  email: string;
};

type Props = {
  mode: "create" | "edit";
  editingId: string | null;
  sectionId: string;
  sectionSlug: string;
  sectionDesignation: string;
  programmes: ProgrammeOption[];
  chefSection: ChefSectionDefaults;
  onCancel: () => void;
  onSaved: () => void;
};

const CURRENCIES = ["USD", "CDF"] as const;
type Step = 1 | 2 | 3 | 4;

const STEPS: ResourceStepMeta[] = [
  { num: 1, label: "Général", icon: "solar:document-text-bold-duotone" },
  { num: 2, label: "Description", icon: "solar:notes-bold-duotone" },
  { num: 3, label: "Matières", icon: "solar:notebook-bold-duotone" },
  { num: 4, label: "Branding", icon: "solar:buildings-3-bold-duotone" },
];

function emptyForm() {
  return {
    designation: "",
    amount: "0",
    currency: "USD",
    brandingSectionLabel: "",
    brandingContact: "",
    brandingEmail: "",
    brandingAdresse: "",
  };
}

function defaultDescriptionSections(): DescriptionSectionInput[] {
  return [{ title: "", contenu: [""] }];
}

function descriptionHasBody(sections: DescriptionSectionInput[]): boolean {
  for (const s of sections) {
    const lines = (s.contenu ?? []).map((c) => String(c).trim()).filter(Boolean);
    if (lines.length > 0) return true;
  }
  return false;
}

function selectionRecordFromList(list: SessionMatiereInput[]): Record<string, SessionMatiereInput> {
  const out: Record<string, SessionMatiereInput> = {};
  for (const m of list) {
    const ref = String(m.reference ?? "").trim();
    if (!ref) continue;
    out[ref] = {
      reference: ref,
      designation: String(m.designation ?? "").trim(),
      credit: String(m.credit ?? "").trim(),
    };
  }
  return out;
}

export default function GestionnaireSessionResourceForm({
  mode,
  editingId,
  sectionId,
  sectionSlug,
  sectionDesignation,
  programmes,
  chefSection,
  onCancel,
  onSaved,
}: Props) {
  const [step, setStep] = useState<Step>(1);
  const [form, setForm] = useState(emptyForm);
  const [activeProgrammeId, setActiveProgrammeId] = useState<string>("");
  const [matieresByProgramme, setMatieresByProgramme] = useState<Record<string, FlatMatiere[]>>({});
  const [matieresLoading, setMatieresLoading] = useState(false);
  const [selectedMatieres, setSelectedMatieres] = useState<Record<string, SessionMatiereInput>>({});
  const [descriptionSections, setDescriptionSections] = useState<DescriptionSectionInput[]>(
    defaultDescriptionSections
  );
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [hydrated, setHydrated] = useState(mode === "create");

  const [matiereLoadNonce, setMatiereLoadNonce] = useState(0);

  useEffect(() => {
    if (step === 3 && programmes.length > 0 && !activeProgrammeId) {
      setActiveProgrammeId(programmes[0].id);
    }
  }, [step, programmes, activeProgrammeId]);

  useEffect(() => {
    if (step !== 3 || !sectionId || !activeProgrammeId) return;
    let cancelled = false;
    setMatieresLoading(true);
    setError(null);
    void (async () => {
      try {
        const res = await fetch(
          `/api/sections/${sectionId}/programmes/${activeProgrammeId}/matieres-flat`,
          { method: "GET" }
        );
        const json = (await res.json()) as { message?: string; data?: { matieres?: FlatMatiere[] } };
        if (!res.ok) {
          throw new Error(typeof json.message === "string" ? json.message : "Chargement des matières impossible.");
        }
        const list = Array.isArray(json.data?.matieres) ? json.data!.matieres! : [];
        if (!cancelled) {
          setMatieresByProgramme((prev) => ({ ...prev, [activeProgrammeId]: list }));
        }
      } catch (e) {
        if (!cancelled) setError((e as Error).message);
      } finally {
        if (!cancelled) setMatieresLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [step, sectionId, activeProgrammeId, matiereLoadNonce]);

  useEffect(() => {
    if (mode === "create") {
      setStep(1);
      setForm({
        ...emptyForm(),
        brandingSectionLabel: sectionDesignation,
        brandingContact: chefSection.telephone,
        brandingEmail: chefSection.email,
      });
      setActiveProgrammeId("");
      setMatieresByProgramme({});
      setSelectedMatieres({});
      setDescriptionSections(defaultDescriptionSections());
      setError(null);
      setLoadError(null);
      setHydrated(true);
      return;
    }
    if (!editingId) return;
    setHydrated(false);
    setLoadError(null);
    startTransition(async () => {
      try {
        const detail = await getGestionnaireSessionResourceAction({ sectionSlug, id: editingId });
        setForm({
          designation: detail.designation,
          amount: String(detail.amount),
          currency: detail.currency || "USD",
          brandingSectionLabel: detail.brandingSectionLabel || sectionDesignation,
          brandingContact: detail.brandingContact,
          brandingEmail: detail.brandingEmail,
          brandingAdresse: detail.brandingAdresse,
        });
        setSelectedMatieres(selectionRecordFromList(detail.matieresSelection ?? []));
        setMatieresByProgramme({});
        setActiveProgrammeId(programmes[0]?.id ?? "");
        setDescriptionSections(
          detail.descriptionSections.length > 0 ? detail.descriptionSections : defaultDescriptionSections()
        );
        setStep(1);
        setError(null);
        setHydrated(true);
      } catch (e) {
        setLoadError((e as Error).message);
        setHydrated(true);
      }
    });
  }, [mode, editingId, sectionSlug, sectionDesignation, chefSection.email, chefSection.telephone, programmes]);

  const toggleMatiere = useCallback((m: FlatMatiere) => {
    setSelectedMatieres((prev) => {
      const next = { ...prev };
      if (next[m.reference]) {
        delete next[m.reference];
      } else {
        next[m.reference] = {
          reference: m.reference,
          designation: m.designation,
          credit: m.credits > 0 ? String(m.credits) : "",
        };
      }
      return next;
    });
  }, []);

  const refreshActiveProgrammeMatieres = useCallback(() => {
    setMatiereLoadNonce((n) => n + 1);
  }, []);

  const validateStep = (s: Step): boolean => {
    if (s === 1) {
      if (!form.designation.trim()) {
        setError("Indiquez une désignation.");
        return false;
      }
      if (!form.amount.trim() || Number.isNaN(Number(form.amount)) || Number(form.amount) < 0) {
        setError("Montant invalide.");
        return false;
      }
    }
    if (s === 2) {
      if (!descriptionHasBody(descriptionSections)) {
        setError("Ajoutez au moins une ligne de contenu dans la description.");
        return false;
      }
    }
    if (s === 3) {
      if (Object.keys(selectedMatieres).length === 0) {
        setError("Sélectionnez au moins une matière (vous pouvez en choisir dans plusieurs programmes).");
        return false;
      }
    }
    if (s === 4) {
      if (!form.brandingContact.trim() || !form.brandingEmail.trim() || !form.brandingAdresse.trim()) {
        setError("Renseignez contact, e-mail et adresse de la section.");
        return false;
      }
    }
    setError(null);
    return true;
  };

  const goNext = () => {
    if (!validateStep(step)) return;
    if (step < 4) setStep((step + 1) as Step);
  };

  const goBack = () => {
    setError(null);
    if (step > 1) setStep((step - 1) as Step);
  };

  const submit = useCallback(() => {
    if (!validateStep(4)) return;
    setError(null);
    const matieres = Object.values(selectedMatieres);
    startTransition(async () => {
      try {
        const payload = {
          sectionSlug,
          designation: form.designation.trim(),
          descriptionSections,
          amount: Number(form.amount),
          currency: form.currency,
          matieres,
          brandingSectionLabel: form.brandingSectionLabel.trim() || sectionDesignation,
          brandingContact: form.brandingContact.trim(),
          brandingEmail: form.brandingEmail.trim(),
          brandingAdresse: form.brandingAdresse.trim(),
        };
        if (mode === "create") {
          await createGestionnaireSessionResourceAction(payload);
        } else if (editingId) {
          await updateGestionnaireSessionResourceAction({ ...payload, id: editingId });
        }
        onSaved();
      } catch (e) {
        setError((e as Error).message);
      }
    });
  }, [
    mode,
    editingId,
    sectionSlug,
    sectionDesignation,
    form,
    descriptionSections,
    selectedMatieres,
    onSaved,
  ]);

  const activeProgramme = programmes.find((p) => p.id === activeProgrammeId);
  const visibleMatieres = activeProgrammeId ? matieresByProgramme[activeProgrammeId] ?? [] : [];
  const selectedCount = Object.keys(selectedMatieres).length;

  if (!hydrated) {
    return (
      <div className="flex items-center justify-center py-16 text-sm text-gray-500">
        <Icon icon="svg-spinners:ring-resize" className="mr-2 h-5 w-5" />
        Chargement…
      </div>
    );
  }

  if (loadError) {
    return (
      <div className="rounded-lg border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-800 dark:border-rose-900 dark:bg-rose-950/40 dark:text-rose-100">
        {loadError}
      </div>
    );
  }

  return (
    <ResourceMultiStepFormShell
      headerTitle={mode === "create" ? "Nouvelle session d'enrôlement" : "Modifier la session"}
      mode={mode}
      steps={STEPS}
      activeStep={step}
      error={error}
      onCancel={onCancel}
      footer={
        <>
          <div className="flex gap-2">
            {step > 1 ? (
              <button
                type="button"
                disabled={pending}
                onClick={goBack}
                className="rounded-xl border border-gray-200 px-4 py-2.5 text-sm font-medium dark:border-gray-600"
              >
                Précédent
              </button>
            ) : null}
          </div>
          <div className="flex gap-2">
            {step < 4 ? (
              <button
                type="button"
                disabled={pending}
                onClick={goNext}
                className="rounded-xl bg-primary px-4 py-2.5 text-sm font-semibold text-white"
              >
                Suivant
              </button>
            ) : (
              <button
                type="button"
                disabled={pending}
                onClick={submit}
                className="rounded-xl bg-primary px-4 py-2.5 text-sm font-semibold text-white disabled:opacity-50"
              >
                {pending ? "Enregistrement…" : mode === "create" ? "Créer" : "Enregistrer"}
              </button>
            )}
          </div>
        </>
      }
    >
      {step === 1 ? (
        <div className="grid gap-4 sm:grid-cols-2">
          <div className="sm:col-span-2">
            <label className="text-xs font-medium text-gray-600 dark:text-gray-400">Désignation</label>
            <input
              value={form.designation}
              onChange={(e) => setForm((f) => ({ ...f, designation: e.target.value }))}
              className="mt-1 w-full rounded-lg border border-gray-300 px-3 py-2 text-sm dark:border-gray-600 dark:bg-gray-900 dark:text-white"
              placeholder="Ex. Inscription session spéciale"
            />
          </div>
          <div>
            <label className="text-xs font-medium text-gray-600 dark:text-gray-400">Montant</label>
            <input
              type="number"
              min={0}
              step="0.01"
              value={form.amount}
              onChange={(e) => setForm((f) => ({ ...f, amount: e.target.value }))}
              className="mt-1 w-full rounded-lg border border-gray-300 px-3 py-2 text-sm dark:border-gray-600 dark:bg-gray-900 dark:text-white"
            />
          </div>
          <div>
            <label className="text-xs font-medium text-gray-600 dark:text-gray-400">Devise</label>
            <select
              value={form.currency}
              onChange={(e) => setForm((f) => ({ ...f, currency: e.target.value }))}
              className="mt-1 w-full rounded-lg border border-gray-300 px-3 py-2 text-sm dark:border-gray-600 dark:bg-gray-900 dark:text-white"
            >
              {CURRENCIES.map((c) => (
                <option key={c} value={c}>
                  {c}
                </option>
              ))}
            </select>
          </div>
        </div>
      ) : null}

      {step === 2 ? (
        <SujetResourceDescriptionEditor value={descriptionSections} onChange={setDescriptionSections} />
      ) : null}

      {step === 3 ? (
        <div className="space-y-4">
          <p className="text-sm text-gray-600 dark:text-gray-400">
            Choisissez un <strong>programme</strong> à gauche : les matières sont chargées via l’endpoint{" "}
            <code className="rounded bg-gray-100 px-1 text-xs dark:bg-gray-800">matieres-flat</code>. La{" "}
            <strong>référence</strong> envoyée au service étudiant est l’<strong>_id</strong> de chaque matière en
            base.
          </p>
          {selectedCount > 0 ? (
            <p className="text-xs font-semibold text-primary">
              {selectedCount} matière{selectedCount > 1 ? "s" : ""} sélectionnée{selectedCount > 1 ? "s" : ""}
            </p>
          ) : null}

          <div className="grid min-h-[20rem] gap-4 md:grid-cols-2">
            <div className="flex flex-col overflow-hidden rounded-xl border border-gray-200 bg-gray-50/80 dark:border-gray-700 dark:bg-gray-900/50">
              <div className="border-b border-gray-200 px-3 py-2 text-xs font-bold uppercase tracking-wide text-gray-500 dark:border-gray-700 dark:text-gray-400">
                Programmes
              </div>
              <ul className="max-h-80 flex-1 space-y-0.5 overflow-y-auto p-2">
                {programmes.map((p) => (
                  <li key={p.id}>
                    <button
                      type="button"
                      onClick={() => setActiveProgrammeId(p.id)}
                      className={`flex w-full flex-col rounded-lg px-3 py-2 text-left text-sm transition ${
                        activeProgrammeId === p.id
                          ? "bg-primary text-white shadow-md"
                          : "text-midnight_text hover:bg-white dark:text-white dark:hover:bg-gray-800"
                      }`}
                    >
                      <span className="font-semibold">{p.designation}</span>
                      <span className={`text-xs ${activeProgrammeId === p.id ? "text-white/90" : "text-gray-500"}`}>
                        {p.slug} · {p.credits} cr. prog.
                      </span>
                    </button>
                  </li>
                ))}
              </ul>
            </div>

            <div className="flex flex-col overflow-hidden rounded-xl border border-gray-200 dark:border-gray-700">
              <div className="flex flex-wrap items-center justify-between gap-2 border-b border-gray-200 px-3 py-2 dark:border-gray-700">
                <span className="text-xs font-bold uppercase tracking-wide text-gray-500 dark:text-gray-400">
                  Matières
                  {activeProgramme ? (
                    <span className="ml-2 font-normal normal-case text-gray-600 dark:text-gray-300">
                      — {activeProgramme.designation}
                    </span>
                  ) : null}
                </span>
                {activeProgrammeId ? (
                  <button
                    type="button"
                    onClick={refreshActiveProgrammeMatieres}
                    className="text-xs font-medium text-primary hover:underline"
                  >
                    Actualiser
                  </button>
                ) : null}
              </div>
              <div className="max-h-80 flex-1 overflow-y-auto p-3">
                {!activeProgrammeId ? (
                  <p className="text-sm text-gray-500">Sélectionnez un programme.</p>
                ) : matieresLoading ? (
                  <div className="flex items-center gap-2 py-8 text-sm text-gray-500">
                    <Icon icon="svg-spinners:ring-resize" className="h-5 w-5" />
                    Chargement des matières…
                  </div>
                ) : visibleMatieres.length === 0 ? (
                  <p className="text-sm text-gray-500">
                    Aucune matière dans ce programme (vérifiez semestres et unités d’enseignement).
                  </p>
                ) : (
                  <ul className="space-y-2">
                    {visibleMatieres.map((m) => (
                      <li key={`${m.id}-${m.reference}`}>
                        <label className="flex cursor-pointer items-start gap-3 rounded-lg border border-transparent px-2 py-1.5 hover:border-primary/30 hover:bg-primary/5">
                          <input
                            type="checkbox"
                            checked={!!selectedMatieres[m.reference]}
                            onChange={() => toggleMatiere(m)}
                            className="mt-1"
                          />
                          <span className="min-w-0">
                            <span className="font-medium text-midnight_text dark:text-white">{m.designation}</span>
                            <span
                              className="mt-0.5 block max-w-full truncate font-mono text-[11px] text-gray-500"
                              title={m.reference}
                            >
                              {m.reference}
                              {m.code ? ` · ${m.code}` : ""}
                              {m.credits > 0 ? ` · ${m.credits} cr.` : ""}
                            </span>
                          </span>
                        </label>
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            </div>
          </div>
        </div>
      ) : null}

      {step === 4 ? (
        <div className="grid gap-4">
          <div>
            <label className="text-xs font-medium text-gray-600 dark:text-gray-400">Libellé section (branding)</label>
            <input
              value={form.brandingSectionLabel}
              onChange={(e) => setForm((f) => ({ ...f, brandingSectionLabel: e.target.value }))}
              className="mt-1 w-full rounded-lg border border-gray-300 px-3 py-2 text-sm dark:border-gray-600 dark:bg-gray-900 dark:text-white"
            />
          </div>
          <div>
            <label className="text-xs font-medium text-gray-600 dark:text-gray-400">Contact (téléphone)</label>
            <input
              value={form.brandingContact}
              onChange={(e) => setForm((f) => ({ ...f, brandingContact: e.target.value }))}
              className="mt-1 w-full rounded-lg border border-gray-300 px-3 py-2 text-sm dark:border-gray-600 dark:bg-gray-900 dark:text-white"
            />
          </div>
          <div>
            <label className="text-xs font-medium text-gray-600 dark:text-gray-400">E-mail</label>
            <input
              type="email"
              value={form.brandingEmail}
              onChange={(e) => setForm((f) => ({ ...f, brandingEmail: e.target.value }))}
              className="mt-1 w-full rounded-lg border border-gray-300 px-3 py-2 text-sm dark:border-gray-600 dark:bg-gray-900 dark:text-white"
            />
          </div>
          <div>
            <label className="text-xs font-medium text-gray-600 dark:text-gray-400">Adresse</label>
            <textarea
              rows={3}
              value={form.brandingAdresse}
              onChange={(e) => setForm((f) => ({ ...f, brandingAdresse: e.target.value }))}
              className="mt-1 w-full rounded-lg border border-gray-300 px-3 py-2 text-sm dark:border-gray-600 dark:bg-gray-900 dark:text-white"
            />
          </div>
        </div>
      ) : null}
    </ResourceMultiStepFormShell>
  );
}
